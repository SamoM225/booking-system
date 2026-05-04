import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http-error.js';

// Times are stored as local wall-clock time (Europe/Bratislava) written into the UTC fields of a Date,
// so "2026-10-01" + "09:30" is saved as 2026-10-01T09:30Z and read back the same way. No timezone math.
const TIMEZONE = 'Europe/Bratislava';
const pad = (n: number) => String(n).padStart(2, '0');

export const toDate = (date: string, time = '00:00') => new Date(`${date}T${time}:00Z`);
export const fromDate = (value: Date) => ({ date: value.toISOString().slice(0, 10), time: value.toISOString().slice(11, 16) });
export const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const fromMinutes = (total: number) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
export const nowLocal = () => new Date(new Date().toLocaleString('sv-SE', { timeZone: TIMEZONE }).replace(' ', 'T') + 'Z');
export const todayLocal = () => fromDate(nowLocal()).date;

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const dayOfWeek = (date: string) => DAYS[toDate(date).getUTCDay()]!;

export const SLOT_STEP_MINUTES = 30;
// Bookings in these statuses do not block the specialist's time
const FREE_STATUSES = ['cancelled', 'declined'] as const;

export const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export interface WorkingDay {
    day: string
    label: string
    enabled: boolean
    open: string
    close: string
}

export function defaultSchedule(): WorkingDay[] {
    return WEEK.map((day, i) => ({
        day,
        label: day[0]!.toUpperCase() + day.slice(1),
        enabled: i < 5,
        open: '09:00',
        close: '17:00'
    }));
}

// userAvailability rows are stored per user + weekday: hours = "HH:mm-HH:mm", status = enabled or not.
export async function getSchedule(userId: string): Promise<WorkingDay[]> {
    const rows = await prisma.userAvailability.findMany({ where: { userId } });
    return defaultSchedule().map((fallback) => {
        const row = rows.find(item => item.day === fallback.day);
        if (!row?.hours) return fallback;
        const [open, close] = row.hours.split('-');
        return { ...fallback, enabled: row.status === 'available', open: open!, close: close! };
    });
}

export async function getAllSchedules(userIds: string[]) {
    const entries = await Promise.all(userIds.map(async id => [id, await getSchedule(id)] as const));
    return Object.fromEntries(entries);
}

export async function setSchedule(userId: string, days: WorkingDay[]) {
    await prisma.$transaction(async (tx) => {
        for (const item of days) {
            const day = item.day as typeof WEEK[number];
            const data = { hours: `${item.open}-${item.close}`, status: item.enabled ? 'available' as const : 'unavailable' as const };
            const existing = await tx.userAvailability.findFirst({ where: { userId, day } });
            if (existing) await tx.userAvailability.update({ where: { id: existing.id }, data });
            else await tx.userAvailability.create({ data: { userId, day, ...data } });
        }
    });
    return getSchedule(userId);
}

export async function isClosed(date: string) {
    return Boolean(await prisma.unavailable.findFirst({ where: { date: toDate(date) } }));
}

// Local start/end (minutes from midnight) of every active booking of a specialist on a given local date
async function busyRanges(userId: string, date: string, ignoreBookingId?: number) {
    const from = toDate(date);
    const to = new Date(from.getTime() + 36 * 60 * 60 * 1000);
    const bookings = await prisma.bookings.findMany({
        where: {
            userId,
            date: { gte: from, lt: to },
            status: { notIn: [...FREE_STATUSES] },
            ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {})
        },
        include: { service: true }
    });
    return bookings
        .map((booking) => {
            const local = fromDate(booking.date);
            const start = toMinutes(local.time);
            return { date: local.date, start, end: start + booking.service.duration };
        })
        .filter(range => range.date === date);
}

export async function getSlots(input: { userId: string, serviceId: number, date: string }) {
    const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
    if (!service || !service.active) return [];
    if (await isClosed(input.date)) return [];

    const day = (await getSchedule(input.userId)).find(item => item.day === dayOfWeek(input.date));
    if (!day?.enabled) return [];

    const busy = await busyRanges(input.userId, input.date);
    const now = nowLocal().getTime();
    const slots: string[] = [];
    for (let start = toMinutes(day.open); start + service.duration <= toMinutes(day.close); start += SLOT_STEP_MINUTES) {
        const time = fromMinutes(start);
        if (toDate(input.date, time).getTime() <= now) continue;
        if (busy.some(range => start < range.end && start + service.duration > range.start)) continue;
        slots.push(time);
    }
    return slots;
}

// Business rules every new/changed booking must satisfy.
// `strict` (public booking) also requires the time to be an offered slot, admins may book outside working hours.
export async function assertBookable(input: {
    userId: string
    serviceId: number
    date: string
    time: string
    ignoreBookingId?: number
    strict?: boolean
}) {
    const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
    if (!service) throw new HttpError(400, 'Service does not exist');
    if (input.strict && !service.active) throw new HttpError(400, 'Service is not available');

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user || !user.active) throw new HttpError(400, 'Specialist is not available');

    if (await isClosed(input.date)) throw new HttpError(409, 'The business is closed on this date');

    if (input.strict) {
        const slots = await getSlots({ userId: input.userId, serviceId: input.serviceId, date: input.date });
        if (!slots.includes(input.time)) throw new HttpError(409, 'This time is no longer available');
        return;
    }

    const start = toMinutes(input.time);
    const busy = await busyRanges(input.userId, input.date, input.ignoreBookingId);
    if (busy.some(range => start < range.end && start + service.duration > range.start)) {
        throw new HttpError(409, 'This specialist already has an overlapping booking');
    }
}
