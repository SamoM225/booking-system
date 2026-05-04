import { prisma } from '../../db/prisma.js';
import type { CreateBookingInput } from './booking.schema.js';

export function createBooking(data: CreateBookingInput) {
    return prisma.bookings.create({
        data: {
            ...data,
            date: new Date(data.datetime)
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