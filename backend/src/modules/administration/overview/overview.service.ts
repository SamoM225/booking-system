import { prisma } from "../../../db/prisma.js";
import { toDate, todayLocal } from "../../booking/scheduling.js";
import { findBookings, toBookingDto } from "../bookings/bookings.service.js";

export async function overview() {
    const today = todayLocal();
    const from = toDate(today, '00:00');
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

    const [todayBookings, pending, members, services] = await Promise.all([
        findBookings({ date: { gte: from, lt: to }, status: { notIn: ['cancelled', 'declined'] } }),
        prisma.bookings.count({ where: { status: 'pending' } }),
        prisma.user.count({ where: { active: true, role: { in: ['admin', 'worker'] } } }),
        prisma.service.count({ where: { active: true } })
    ]);

    return {
        today,
        todayBookings: todayBookings.map(toBookingDto),
        pending,
        activeMembers: members,
        activeServices: services
    };
}
