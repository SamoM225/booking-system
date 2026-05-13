import 'dotenv/config';

function required(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value
}

export const config = {
    port: Number(process.env.PORT || 3020),
    databaseUrl: required('DATABASE_URL'),
    redisUrl: required('REDIS_URL'),
    sessionSecret: required('SESSION_SECRET'),
    isProd: process.env.NODE_ENV === 'production',
    // Public URL of the frontend, used for links in e-mails (scripts/dev.mjs sets it to the dev port)
    appUrl: (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
    mail: {
        // smtp = real delivery (Mailpit in development), memory = kept in an in-process outbox (tests)
        transport: process.env.MAIL_TRANSPORT === 'memory' ? 'memory' as const : 'smtp' as const,
        host: process.env.SMTP_HOST || '127.0.0.1',
        port: Number(process.env.SMTP_PORT || 1025),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || 'Booking <no-reply@booking.local>',
    },
}
