import { prisma } from '../../db/prisma.js';
import type { Request, Response } from 'express';
import { HttpError } from '../../lib/http-error.js';
import { findUserIdByEmail } from '../users/users.service.js';


// E-mails are compared case-insensitively: Jane@X.com and jane@x.com are the same person
export async function getUser(data: { email: string }) {
    const id = await findUserIdByEmail(String(data.email ?? ''));
    if (!id) return null;
    return await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            active: true,
            sessionVersion: true,
        }
    })
}

export async function registerUser(data: { email: string, name: string, password: string }) {
    if (await findUserIdByEmail(data.email)) {
        throw new HttpError(409, 'An account with this e-mail already exists');
    }
    return await prisma.user.create({
        data: {
            email: data.email,
            name: data.name,
            password: data.password,
        }
    })
}

export function logout(req: Request, res: Response) {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Error occurred while logging out" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
    });
}
