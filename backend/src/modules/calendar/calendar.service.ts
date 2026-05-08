import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import type { Staff } from "../../middleware/auth.js";
import { getAllSchedules, toDate } from "../booking/scheduling.js";
import type { BookingInput } from "../administration/bookings/bookings.schema.js";
import { createBooking, deleteBooking, findBookings, toBookingDto, updateBooking } from "../administration/bookings/bookings.service.js";
import type { MoveBookingInput, TimeOffInput } from "./calendar.schema.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const isAdmin = (staff: Staff) => staff.role === 'admin';

// Workers only see and change their own calendar, admins everyone's
function assertOwn(staff: Staff, userId: string) {
    if (!isAdmin(staff) && userId !== staff.id) {
        throw new HttpError(403, 'You can only manage your own calendar');
    }
}

// "2026-10-02T09:30" <-> Date, same wall-clock-in-UTC convention as scheduling.ts
const parseDateTime = (value: string) => new Date(`${value}:00Z`);
const formatDateTime = (value: Date) => value.toISOString().slice(0, 16);

type TimeOffRecord = { id: number, userId: string, from: Date | null, to: Date | null, reason: string };

function toTimeOffDto(row: TimeOffRecord) {
    return { id: row.id, userId: row.userId, from: formatDateTime(row.from!), to: formatDateTime(row.to!), reason: row.reason };
}

async function findBookingOrThrow(id: number) {
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking) throw new HttpError(404, 'Booking not found');
    return booking;
}

async function findTimeOffOrThrow(id: number) {
    const row = await prisma.userAvailability.findUnique({ where: { id } });
    if (!row || !row.from || !row.to) throw new HttpError(404, 'Time off not found');
    return row;
}

// Everything the calendar needs for a date range, scoped to what the signed-in member may see
export async function getCalendar(staff: Staff, query: { from: string, to: string, userId?: string }) {
    if (query.userId) assertOwn(staff, query.userId);

    const members = await prisma.user.findMany({
        where: isAdmin(staff) ? { role: { in: ['admin', 'worker'] } } : { id: staff.id },
        select: { id: true, name: true, email: true, role: true, active: true, services: { select: { id: true } } },
        orderBy: { createdAt: 'asc' }
    });
    const userIds = query.userId ? [query.userId] : members.map(member => member.id);

    const start = toDate(query.from);
    const end = new Date(toDate(query.to).getTime() + DAY_MS);

    const [services, bookings, timeOff, closures, schedules] = await Promise.all([
        prisma.service.findMany({ select: { id: true, name: true, duration: true, price: true, active: true }, orderBy: { name: 'asc' } }),
        findBookings({ userId: { in: userIds }, date: { gte: start, lt: end } }),
        prisma.userAvailability.findMany({
            where: { userId: { in: userIds }, status: 'unavailable', from: { lt: end }, to: { gt: start } },
            orderBy: { from: 'asc' }
        }),
        prisma.unavailable.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: 'asc' } }),
        getAllSchedules(members.map(member => member.id))
    ]);

    return {
        members: members.map(({ services, ...member }) => ({ ...member, serviceIds: services.map(service => service.id) })),
        services,
        schedules,
        bookings: bookings.map(toBookingDto),
        timeOff: timeOff.map(toTimeOffDto),
        closures: closures.map(closure => ({ id: closure.id, date: closure.date.toISOString().slice(0, 10), reason: closure.reason }))
    };
}

export async function createCalendarBooking(staff: Staff, data: BookingInput) {
    assertOwn(staff, data.userId);
    return createBooking(data);
}

export async function updateCalendarBooking(staff: Staff, id: number, data: BookingInput) {
    assertOwn(staff, (await findBookingOrThrow(id)).userId);
    assertOwn(staff, data.userId);
    return updateBooking(id, data);
}

// Drag & drop: keep everything, change the start (and the specialist when dropped into another column)
export async function moveCalendarBooking(staff: Staff, id: number, data: MoveBookingInput) {
    const booking = await findBookingOrThrow(id);
    assertOwn(staff, booking.userId);
    const userId = data.userId ?? booking.userId;
    assertOwn(staff, userId);

    const { id: _, ...current } = toBookingDto(booking);
    return updateBooking(id, { ...current, status: current.status as BookingInput['status'], userId, date: data.date, time: data.time });
}

export async function deleteCalendarBooking(staff: Staff, id: number) {
    if (!isAdmin(staff)) throw new HttpError(403, 'Only administrators can delete bookings');
    await findBookingOrThrow(id);
    return deleteBooking(id);
}

async function assertTimeOffFree(data: TimeOffInput, ignoreId?: number) {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user || !['admin', 'worker'].includes(user.role)) throw new HttpError(400, 'Specialist does not exist');

    const from = parseDateTime(data.from);
    const to = parseDateTime(data.to);

    const overlapping = await prisma.userAvailability.count({
        where: { userId: data.userId, status: 'unavailable', from: { lt: to }, to: { gt: from }, ...(ignoreId ? { id: { not: ignoreId } } : {}) }
    });
    if (overlapping > 0) throw new HttpError(409, 'This overlaps another time off of the specialist');

    // Bookings start at most one day before `from`, so this window catches everything that can still be running
    const bookings = await prisma.bookings.findMany({
        where: {
            userId: data.userId,
            status: { notIn: ['cancelled', 'declined'] },
            date: { gte: new Date(from.getTime() - DAY_MS), lt: to }
        },
        include: { service: true }
    });
    const clashes = bookings.filter(booking => booking.date.getTime() + booking.service.duration * 60000 > from.getTime());
    if (clashes.length > 0) {
        throw new HttpError(409, `This time has ${clashes.length} booking(s). Move or cancel them first`);
    }
    return { from, to };
}

export async function createTimeOff(staff: Staff, data: TimeOffInput) {
    assertOwn(staff, data.userId);
    const range = await assertTimeOffFree(data);
    const row = await prisma.userAvailability.create({
        data: { userId: data.userId, ...range, status: 'unavailable', reason: data.reason }
    });
    return toTimeOffDto(row);
}

export async function updateTimeOff(staff: Staff, id: number, data: TimeOffInput) {
    assertOwn(staff, (await findTimeOffOrThrow(id)).userId);
    assertOwn(staff, data.userId);
    const range = await assertTimeOffFree(data, id);
    const row = await prisma.userAvailability.update({
        where: { id },
        data: { userId: data.userId, ...range, reason: data.reason }
    });
    return toTimeOffDto(row);
}

export async function deleteTimeOff(staff: Staff, id: number) {
    assertOwn(staff, (await findTimeOffOrThrow(id)).userId);
    await prisma.userAvailability.delete({ where: { id } });
    return { id };
}
