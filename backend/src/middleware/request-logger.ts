import type { Request, Response, NextFunction } from "express";

// Invitation links carry a secret token, it must not end up in the logs
const redact = (url: string) => url.replace(/\/invitations\/[^/?#]+/gi, '/invitations/[token]');

export function requestLogger(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        console.log(`${req.method} ${redact(req.originalUrl)} - ${res.statusCode} - ${responseTime}ms`);
    });
    
    next();
}
