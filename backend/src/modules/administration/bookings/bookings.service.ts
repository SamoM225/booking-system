import { prisma } from "../../../db/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { assertBookable, fromDate, toDate } from "../../booking/scheduling.js";
import type { BookingInput } from "./bookings.schema.js";

type BookingRecord = Awaited<ReturnType<typeof findBookings>>[number];

export function findBookings(where?: Prisma.BookingsWhereInput) {
    return prisma.bookings.findMany({
        where,
        orderBy: { date: 'asc' }
    });
}

// Booking in the shape the admin UI uses (local date + time, camelCase)
export function toBookingDto(booking: BookingRecord) {
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

function toBookingData(data: BookingInput) {
    return {
        serviceId: data.serviceId,
        userId: data.userId,
        date: toDate(data.date, data.time),
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone_number: data.phone,
        note: data.note,
        status: data.status
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

export async function createBooking(data: BookingInput) {
    if (data.status !== 'cancelled') {
        await assertBookable({ userId: data.userId, serviceId: data.serviceId, date: data.date, time: data.time });
    }

    const booking = await prisma.bookings.create({
        data: { ...toBookingData(data), ToS: true }
    });
    return toBookingDto(booking);
}

export async function updateBooking(id: number, data: BookingInput) {
    if (data.status !== 'cancelled') {
        await assertBookable({ userId: data.userId, serviceId: data.serviceId, date: data.date, time: data.time, ignoreBookingId: id });
    }

    const booking = await prisma.bookings.update({
        where: { id },
        data: toBookingData(data)
    });
    return toBookingDto(booking);
}

export async function deleteBooking(id: number) {
    return prisma.bookings.delete({ where: { id } });
}
