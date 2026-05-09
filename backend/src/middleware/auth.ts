import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';

export interface Staff { id: string, role: string }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if(!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if(!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
    }
    next()
}

// Admins and workers (calendar). Role is read from the DB so a deactivated or demoted member loses access right away.
export async function requireStaff(req: Request, res: Response, next: NextFunction) {
    const user = req.session.userId
        ? await prisma.user.findUnique({ where: { id: req.session.userId }, select: { id: true, role: true, active: true } })
        : null;
    if (!user || !user.active || !['admin', 'worker'].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    req.session.role = user.role;
    res.locals.staff = { id: user.id, role: user.role } satisfies Staff;
    next()
}
