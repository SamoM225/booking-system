/// <reference path="../types/session.d.ts" />
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';

export interface Staff { id: string, role: string }

export interface CurrentUser {
    id: string
    email: string
    name: string
    role: string
    active: boolean
    sessionVersion: number
}

export const STAFF_ROLES = ['admin', 'worker'];

/** Stores the user in the session, on a fresh session id (no session fixation). */
export function signIn(req: Request, user: { id: string, role: string, sessionVersion: number }) {
    return new Promise<void>((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) return reject(error);
            req.session.userId = user.id;
            req.session.role = user.role;
            req.session.version = user.sessionVersion;
            resolve();
        });
    });
}

// Loads the signed-in user from the database on every request, so a deactivated, demoted or signed-out-everywhere
// account loses access right away instead of when its 24h cookie runs out. The result is in res.locals.user.
export async function currentUser(req: Request, res: Response, next: NextFunction) {
    const id = req.session.userId;
    if (!id) return next();

    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, role: true, active: true, sessionVersion: true }
    });
    if (!user || !user.active || user.sessionVersion !== (req.session.version ?? 0)) {
        delete req.session.userId;
        delete req.session.role;
        delete req.session.version;
        return next();
    }
    req.session.role = user.role;
    res.locals.user = user satisfies CurrentUser;
    next();
}

export const userOf = (res: Response) => res.locals.user as CurrentUser | undefined;

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if(!userOf(res)) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if(userOf(res)?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
    }
    next()
}

// Admins and workers (calendar)
export function requireStaff(req: Request, res: Response, next: NextFunction) {
    const user = userOf(res);
    if (!user || !STAFF_ROLES.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    res.locals.staff = { id: user.id, role: user.role } satisfies Staff;
    next()
}
