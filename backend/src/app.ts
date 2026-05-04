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


    return app;

}