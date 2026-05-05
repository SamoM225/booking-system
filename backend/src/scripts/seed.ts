// Demo data so the booking flow has something to choose from: npm run db:seed (safe to run repeatedly)
import bcrypt from 'bcrypt';
import { prisma } from '../db/prisma.js';

const catalog = {
    Haircut: [
        { name: 'Cut & styling', description: 'A fresh cut, finished your way.', duration: 45, price: 35 },
        { name: 'Hair consultation', description: 'Find the right look with your specialist.', duration: 30, price: 15 }
    ],
    Massage: [
        { name: 'Relaxing massage', description: 'A little time to slow down and unwind.', duration: 60, price: 50 },
        { name: 'Deep tissue massage', description: 'Focused care for tired muscles.', duration: 60, price: 60 }
    ],
    Manicure: [
        { name: 'Classic manicure', description: 'Everyday care, beautifully finished.', duration: 30, price: 25 }
    ]
};

const team = [
    { name: 'Alice Morgan', email: 'alice@example.com', role: 'admin' },
    { name: 'Bob Williams', email: 'bob@example.com', role: 'worker' },
    { name: 'Charlie Davis', email: 'charlie@example.com', role: 'worker' }
];

for (const [categoryName, services] of Object.entries(catalog)) {
    const category = await prisma.category.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } });
    for (const service of services) {
        const exists = await prisma.service.findFirst({ where: { name: service.name, categoryId: category.id } });
        if (!exists) await prisma.service.create({ data: { ...service, categoryId: category.id } });
    }
}

// Placeholder password, these accounts are specialists and are not meant for sign-in
const password = await bcrypt.hash(crypto.randomUUID(), 10);
for (const member of team) {
    await prisma.user.upsert({ where: { email: member.email }, update: {}, create: { ...member, password } });
}

console.log('Seeded categories, services and team');
process.exit(0);
