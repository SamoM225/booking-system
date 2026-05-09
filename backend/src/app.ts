import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requestLogger } from './middleware/request-logger.js';
import { prisma } from './db/prisma.js';
import { createUserSchema, loginSchema } from './modules/users/users.schema.js';
import { validateBody } from './middleware/body-middleware.js';
import bcrypt from 'bcrypt';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redis } from './lib/redis.js';
import { config } from './config.js';
import { userRouter } from './modules/users/users.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { bookingRouter } from './modules/booking/booking.routes.js';
import { adminRouter } from './modules/administration/admin.routes.js';
import { publicRouter } from './modules/public/public.routes.js';
import { calendarRouter } from './modules/calendar/calendar.routes.js';
import { HttpError } from './lib/http-error.js';

export function createApp() {
    const app = express();
    

    app.use(express.json());
    app.use(requestLogger);
    app.use(session({
        store: new RedisStore({ client: redis }),
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: config.isProd, // Set to true if using HTTPS
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    }));

    app.get('/health', (req, res) => {
        res.json({ status: 'ok' })
    });

    app.use('/users', userRouter);
    app.use('/auth', authRouter);
    app.use('/bookings', bookingRouter);
    app.use('/admin', adminRouter);
    app.use('/public', publicRouter);
    app.use('/calendar', calendarRouter);

    // Business rule errors (HttpError) and unique constraint violations as JSON
    app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof HttpError) {
            return res.status(err.status).json({ message: err.message });
        }
        if ((err as { code?: string })?.code === 'P2002') {
            return res.status(409).json({ message: 'Already exists' });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    });


    return app;

}