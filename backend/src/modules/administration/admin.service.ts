import { prisma } from "../../db/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { days } from "../../generated/prisma/browser.js";
import type { AdminBookingInput, InviteMemberInput, UpdateMemberInput, createServiceSchema } from "./admin.schema.js";
import { HttpError } from "../../lib/http-error.js";
import { assertBookable, fromDate, getAllSchedules, toDate, todayLocal, getSchedule, setSchedule, type WorkingDay } from "../booking/scheduling.js";

// Set worker open hours
export async function setOpenHours(data: { day: days, openTime: Date, closeTime: Date }, userId?: string | null) {
    const { day, openTime, closeTime } = data;

    if (!userId) {
        throw new Error("User not found");
    }

    const existing = await prisma.userAvailability.findFirst({ where: { day, userId } });

    if (!existing) {
        throw new Error("User not found");
    }

    return existing
        ? prisma.userAvailability.update({
            where: { id: existing.id },
            data: { from: openTime, to: closeTime }
        })
        : prisma.userAvailability.create({
            data: {
                day,
                from: openTime,
                to: closeTime,
                userId
            }
        })
}


export async function setAdmin(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new Error("User not found");
    }

    return prisma.user.update({
        where: { email },
        data: { role: 'admin' }
    });
}

type BookingWithService = Awaited<ReturnType<typeof findBookings>>[number];

// Booking in the shape the admin UI uses (local date + time, camelCase)
function toBookingDto(booking: BookingWithService) {
    const local = fromDate(booking.date);
    return {
        id: booking.id,
        serviceId: booking.serviceId,
        userId: booking.userId,
        date: local.date,
        time: local.time,
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        phone: booking.phone_number,
        note: booking.note,
        status: booking.status === 'declined' ? 'cancelled' : booking.status
    };
}

function findBookings(where?: Prisma.BookingsWhereInput) {
    return prisma.bookings.findMany({
        where,
        orderBy: { date: 'asc' }
    });
}

export async function overview() {
    const today = todayLocal();
    const from = toDate(today, '00:00');
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

    const [todayBookings, pending, members, services] = await Promise.all([
        findBookings({ date: { gte: from, lt: to }, status: { notIn: ['cancelled', 'declined'] } }),
        prisma.bookings.count({ where: { status: 'pending' } }),
        prisma.user.count({ where: { active: true, role: { in: ['admin', 'worker'] } } }),
        prisma.service.count({ where: { active: true } })
    ]);

    return {
        today,
        todayBookings: todayBookings.map(toBookingDto),
        pending,
        activeMembers: members,
        activeServices: services
    };
}

// Without year/month returns every booking
export async function getBookingsByMonth(year?: number, month?: number) {
    if (!year || !month) {
        return (await findBookings()).map(toBookingDto);
    }

    const startDate = toDate(`${year}-${String(month).padStart(2, '0')}-01`, '00:00');
    const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = toDate(next, '00:00');

    return (await findBookings({ date: { gte: startDate, lt: endDate } })).map(toBookingDto);
}

export async function getServices() {
    return prisma.service.findMany({ orderBy: { id: 'asc' } });
}

export async function createService(data: createServiceSchema) {
    return prisma.service.create({
        data
    });
}

export async function updateService(id: number, data: createServiceSchema) {
    return prisma.service.update({
        where: { id },
        data
    });
}

// A service with bookings is archived instead of deleted, the bookings keep pointing to it
export async function deleteService(id: number) {
    const used = await prisma.bookings.count({ where: { serviceId: id } });
    if (used > 0) {
        return prisma.service.update({ where: { id }, data: { active: false } });
    }
    return prisma.service.delete({
        where: { id }
    });
}

export async function createCategory(name: string) {
    return prisma.category.create({
        data: { name }
    });
}

export async function updateCategory(id: number, name: string) {
    return prisma.category.update({
        where: { id },
        data: { name }
    });
}

export async function deleteCategory(id: number) {
    const used = await prisma.service.count({ where: { categoryId: id } });
    if (used > 0) {
        throw new HttpError(409, 'Category still has services');
    }
    return prisma.category.delete({
        where: { id }
    });
}

export async function getCategories() {
    return prisma.category.findMany({ orderBy: { id: 'asc' } });
}

export async function createBooking(data: AdminBookingInput) {
    if (data.status !== 'cancelled') {
        await assertBookable({ userId: data.userId, serviceId: data.serviceId, date: data.date, time: data.time });
    }

    const booking = await prisma.bookings.create({
        data: {
            serviceId: data.serviceId,
            userId: data.userId,
            date: toDate(data.date, data.time),
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone_number: data.phone,
            note: data.note,
            ToS: true,
            status: data.status
        }
    });
    return toBookingDto(booking);
}

export async function updateBooking(id: number, data: AdminBookingInput) {
    if (data.status !== 'cancelled') {
        await assertBookable({ userId: data.userId, serviceId: data.serviceId, date: data.date, time: data.time, ignoreBookingId: id });
    }

    const booking = await prisma.bookings.update({
        where: { id },
        data: {
            serviceId: data.serviceId,
            userId: data.userId,
            date: toDate(data.date, data.time),
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone_number: data.phone,
            note: data.note,
            status: data.status
        }
    });
    return toBookingDto(booking);
}

export async function deleteBooking(id: number) {
    return prisma.bookings.delete({
        where: { id }
    });
}

// ---- Team ----

const memberSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    active: true,
    services: { select: { id: true } }
} satisfies Prisma.UserSelect;

function toMemberDto(member: Prisma.UserGetPayload<{ select: typeof memberSelect }>) {
    const { services, ...rest } = member;
    return { ...rest, serviceIds: services.map(service => service.id) };
}

export async function getMembers() {
    const members = await prisma.user.findMany({
        where: { role: { in: ['admin', 'worker'] } },
        select: memberSelect,
        orderBy: { createdAt: 'asc' }
    });
    return members.map(toMemberDto);
}

export async function updateMember(id: string, data: UpdateMemberInput) {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) {
        throw new HttpError(404, 'User not found');
    }

    const losesAdmin = current.role === 'admin' && current.active && (data.role !== 'admin' || !data.active);
    if (losesAdmin) {
        const otherAdmins = await prisma.user.count({ where: { id: { not: id }, role: 'admin', active: true } });
        if (otherAdmins === 0) {
            throw new HttpError(409, 'Keep at least one active administrator in the team');
        }
    }

    const { serviceIds, ...rest } = data;
    const member = await prisma.user.update({
        where: { id },
        data: {
            ...rest,
            ...(serviceIds ? { services: { set: serviceIds.map(serviceId => ({ id: serviceId })) } } : {})
        },
        select: memberSelect
    });
    return toMemberDto(member);
}

// Invite a new team member by e-mail.
// TODO: implement the invite logic (create the pending user / invitation token, send the e-mail, accept flow).
export async function inviteMember(data: InviteMemberInput): Promise<unknown> {
    throw new HttpError(501, 'Invite is not implemented yet');
}

// ---- Availability ----

export async function getSchedules() {
    const members = await prisma.user.findMany({ where: { role: { in: ['admin', 'worker'] } }, select: { id: true } });
    return getAllSchedules(members.map(member => member.id));
}

export async function updateSchedule(userId: string, days: WorkingDay[]) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new HttpError(404, 'User not found');
    }
    return setSchedule(userId, days);
}

export { getSchedule };

// ---- Closures (whole business closed) ----

function toClosureDto(closure: { id: number, date: Date, reason: string }) {
    return { id: closure.id, date: fromDate(closure.date).date, reason: closure.reason };
}

export async function getClosures() {
    const closures = await prisma.unavailable.findMany({ orderBy: { date: 'asc' } });
    return closures.map(toClosureDto);
}

export async function createClosure(data: { date: string, reason: string }) {
    const date = toDate(data.date);
    if (await prisma.unavailable.findFirst({ where: { date } })) {
        throw new HttpError(409, 'This day is already closed');
    }

    const from = toDate(data.date, '00:00');
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    const bookings = await prisma.bookings.count({
        where: { date: { gte: from, lt: to }, status: { notIn: ['cancelled', 'declined'] } }
    });
    if (bookings > 0) {
        throw new HttpError(409, 'This day has bookings. Reschedule or cancel them before closing the business');
    }

    return toClosureDto(await prisma.unavailable.create({ data: { date, reason: data.reason } }));
}

export async function deleteClosure(id: number) {
    return prisma.unavailable.delete({ where: { id } });
}
