import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CreateUserInput } from './users.schema.js';

export async function listUsers() {
    return await prisma.user.findMany();
}

export async function createUser(input: CreateUserInput) {
    return await prisma.user.create({
        data: {
            ...input,
            password: await bcrypt.hash(input.password, 10)
        }
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

type Db = Pick<Prisma.TransactionClient, '$queryRaw'>;

// Exact, case-insensitive e-mail match. Prisma's `mode: 'insensitive'` compiles to ILIKE, where _ and % are wildcards,
// so "al_ce@x.com" would also match "alice@x.com".
export async function findUserIdByEmail(email: string, db: Db = prisma) {
    const rows = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM users WHERE lower(email) = lower(${email.trim()}) ORDER BY "createdAt" ASC LIMIT 1`;
    return rows[0]?.id ?? null;
}
