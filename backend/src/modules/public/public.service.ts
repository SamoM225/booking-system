import { prisma } from '../../db/prisma.js';
import type { ContactInput } from './public.schema.js';

export function listCategories() {
    return prisma.category.findMany({
        where: { service: { some: { active: true } } },
        orderBy: { name: 'asc' }
    });
}

export function listActiveServices(categoryId?: number) {
    return prisma.service.findMany({
        where: { active: true, ...(categoryId ? { categoryId } : {}) },
        orderBy: { name: 'asc' }
    });
}

// Specialists who can perform the service. A specialist without any assigned services offers all of them.
export function listWorkers(serviceId?: number) {
    return prisma.user.findMany({
        where: {
            active: true,
            role: { in: ['admin', 'worker'] },
            ...(serviceId ? { OR: [{ services: { some: { id: serviceId } } }, { services: { none: {} } }] } : {})
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });
}

// TODO: deliver the message (nodemailer is installed, but no SMTP config exists yet)
export async function sendContactMessage(message: ContactInput) {
    console.log('Contact message received:', message);
}
