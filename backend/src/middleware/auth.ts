import type { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if(!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if(!req.session.userId || req.session.role !== 'ADMIN') {
        return res.status(403).json({ message: "Forbidden" });
    }
    next()
}
