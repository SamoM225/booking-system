import { prisma } from "../../db/prisma.js";
import { days } from "../../generated/prisma/browser.js";
import type { createServiceSchema } from "./admin.schema.js";

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

export async function overview() {
    const todayBookings = await prisma.bookings.findMany({
        where: {
            date: new Date()
        },
        include: {
            user: true,
            service: true
        }
    });
}

export async function getBookingsByMonth(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // last day of the month

    return prisma.bookings.findMany({
        include: {
            user: true,
            service: true
        },
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });
}

export async function getServices() {
    return prisma.service.findMany();
}

export async function createService(data: createServiceSchema   ) {
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

export async function deleteService(id: number) {
    return prisma.service.delete({
        where: { id }
    });
}

export async function createCategory(name: string) {
    return prisma.category.create({
        data: { name }
    });
}