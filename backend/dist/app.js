import express from 'express';
import { requestLogger } from './middleware/request-logger.js';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redis } from './lib/redis.js';
import { config } from './config.js';
import { userRouter } from './modules/users/users.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
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
        res.json({ status: 'ok' });
    });
    app.use('/users', userRouter);
    app.use('/auth', authRouter);
    return app;
}
//# sourceMappingURL=app.js.map