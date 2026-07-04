import bcrypt from 'bcrypt';
import { prisma } from '../db/prisma.js';
import { toDate, todayLocal, WEEK } from '../modules/booking/scheduling.js';
import { buildDemoPlan, CATALOG, DEMO_ACCOUNTS, DEMO_PASSWORD, OTHER_SPECIALIST, SPECIALISTS } from './demo-data.js';

/**
 * Rebuilds the whole database as the demo workspace (src/demo/demo-data.ts). Safe to run repeatedly:
 * the seed runs it on every deploy with DEMO_MODE=true and the nightly cron (/cron/reset-demo) runs it too.
 */
export async function resetDemo() {
    // bcrypt is slow, hash before the transaction
    const demoPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
    const lockedPassword = await bcrypt.hash(crypto.randomUUID(), 10);
    const plan = buildDemoPlan(todayLocal());

    return prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
            'TRUNCATE TABLE "Bookings", "userAvailability", "Unavailable", "Invitation", "_ServiceToUser", "Service", "Category", "users" RESTART IDENTITY CASCADE'
        );

        const serviceIds = new Map<string, number>();
        for (const [categoryName, services] of Object.entries(CATALOG)) {
            const category = await tx.category.create({ data: { name: categoryName } });
            for (const service of services) {
                const created = await tx.service.create({ data: { ...service, categoryId: category.id } });
                serviceIds.set(service.name, created.id);
            }
        }

        const people = [
            ...DEMO_ACCOUNTS.map(account => ({ ...account, password: demoPassword })),
            { ...OTHER_SPECIALIST, password: lockedPassword }
        ];
        for (const person of people) {
            const specialist = SPECIALISTS.find(item => item.id === person.id)!;
            await tx.user.create({
                data: { ...person, services: { connect: specialist.services.map(name => ({ id: serviceIds.get(name)! })) } }
            });
        }

        await tx.userAvailability.createMany({
            data: SPECIALISTS.flatMap(specialist => WEEK.map(day => ({
                userId: specialist.id,
                day,
                hours: specialist.hours[day] ?? '09:00-17:00',
                status: specialist.hours[day] ? 'available' as const : 'unavailable' as const
            })))
        });
        await tx.userAvailability.create({
            data: {
                userId: plan.timeOff.userId,
                from: toDate(plan.timeOff.date, plan.timeOff.from),
                to: toDate(plan.timeOff.date, plan.timeOff.to),
                status: 'unavailable',
                reason: plan.timeOff.reason
            }
        });

        await tx.bookings.createMany({
            data: plan.bookings.map(booking => ({
                serviceId: serviceIds.get(booking.service)!,
                userId: booking.userId,
                date: toDate(booking.date, booking.time),
                first_name: booking.firstName,
                last_name: booking.lastName,
                email: booking.email,
                phone_number: booking.phone,
                ToS: true,
                note: booking.note,
                status: booking.status
            }))
        });

        return { services: serviceIds.size, team: people.length, bookings: plan.bookings.length };
    }, { timeout: 30_000 });
}
