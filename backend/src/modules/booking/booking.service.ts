import { prisma } from '../../db/prisma.js';
import type { CreateBookingInput } from './booking.schema.js';
import { assertBookable, toDate } from './scheduling.js';

// Public booking: the chosen time must be one of the offered slots
export async function createBooking(data: CreateBookingInput) {
    const { date, time, ...rest } = data;
    await assertBookable({ userId: data.userId, serviceId: data.serviceId, date, time, strict: true });

    return prisma.bookings.create({
        data: {
            ...rest,
            date: toDate(date, time),
            status: 'confirmed'
        }
    })
}

// if none bookingId, return all, otherwise return specific booking
export function listBookings(data: { userId: string, bookingId?: number }, isAdmin: boolean) {
    if (data.bookingId) {
        return prisma.bookings.findUnique({
            where: {
                id: data.bookingId,
                userId: data.userId
            },
            include: {
                service: true,
                user: true
            }
        })
    }

    if (isAdmin && !data.bookingId) {
        return prisma.bookings.findMany({
            where: {
                userId: data.userId
            }
        })
    }

    return prisma.bookings.findMany({
        where: {
            userId: data.userId
        },
    });
    
}