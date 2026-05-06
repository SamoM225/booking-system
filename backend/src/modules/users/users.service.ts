import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.js';
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
