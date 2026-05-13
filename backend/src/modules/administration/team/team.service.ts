import { prisma } from "../../../db/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { HttpError } from "../../../lib/http-error.js";
import type { UpdateMemberInput } from "./team.schema.js";

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
