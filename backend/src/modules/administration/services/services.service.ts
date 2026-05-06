import { prisma } from "../../../db/prisma.js";
import type { ServiceInput } from "./services.schema.js";

export async function getServices() {
    return prisma.service.findMany({ orderBy: { id: 'asc' } });
}

export async function createService(data: ServiceInput) {
    return prisma.service.create({ data });
}

export async function updateService(id: number, data: ServiceInput) {
    return prisma.service.update({ where: { id }, data });
}

// A service with bookings is archived instead of deleted, the bookings keep pointing to it
export async function deleteService(id: number) {
    const used = await prisma.bookings.count({ where: { serviceId: id } });
    if (used > 0) {
        return prisma.service.update({ where: { id }, data: { active: false } });
    }
    return prisma.service.delete({ where: { id } });
}
