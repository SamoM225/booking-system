import { prisma } from "../../db/prisma.js";
import { days } from "../../generated/prisma/browser.js";


// Set worker open hours
export async function setOpenHours(data: { day: days, openTime: string, closeTime: string }, userId?: string | null) {
    const { day, openTime, closeTime } = data;

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
            data: { day, from: openTime, to: closeTime }
        });
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