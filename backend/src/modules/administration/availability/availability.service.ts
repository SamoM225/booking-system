import { prisma } from "../../../db/prisma.js";
import { HttpError } from "../../../lib/http-error.js";
import { getAllSchedules, setSchedule, type WorkingDay } from "../../booking/scheduling.js";

// Weekly schedules of every team member, keyed by user id
export async function getSchedules() {
    const members = await prisma.user.findMany({ where: { role: { in: ['admin', 'worker'] } }, select: { id: true } });
    return getAllSchedules(members.map(member => member.id));
}

export async function updateSchedule(userId: string, days: WorkingDay[]) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new HttpError(404, 'User not found');
    }
    return setSchedule(userId, days);
}
