import { prisma } from '../../db/prisma.js';
import type { Request, Response } from 'express';


export async function getUser(data: { email: string }) {
    return await prisma.user.findUnique({
        where: { email: data.email },
        select: {
            id: true,
            email: true,
            name: true,
            password: true,
        }
    })
}

export async function registerUser(data: { email: string, name: string, password: string }) {
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