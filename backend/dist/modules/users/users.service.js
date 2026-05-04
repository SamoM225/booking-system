import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.js';
export async function listUsers() {
    return await prisma.user.findMany();
}
export async function createUser(input) {
    return await prisma.user.create({
        data: {
            ...input,
            password: await bcrypt.hash(input.password, 10)
        }
    });
}
//# sourceMappingURL=users.service.js.map