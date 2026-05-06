import { prisma } from "../../../db/prisma.js";
import { HttpError } from "../../../lib/http-error.js";
import { fromDate, toDate } from "../../booking/scheduling.js";
import type { ClosureInput } from "./closures.schema.js";

function toClosureDto(closure: { id: number, date: Date, reason: string }) {
    return { id: closure.id, date: fromDate(closure.date).date, reason: closure.reason };
}

export async function getClosures() {
    const closures = await prisma.unavailable.findMany({ orderBy: { date: 'asc' } });
    return closures.map(toClosureDto);
}

export async function createClosure(data: ClosureInput) {
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
