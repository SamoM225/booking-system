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