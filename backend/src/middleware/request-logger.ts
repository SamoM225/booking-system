import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`);
    });
    
    next();
}