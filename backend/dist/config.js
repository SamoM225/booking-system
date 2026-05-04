import 'dotenv/config';
function required(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
export const config = {
    port: Number(process.env.PORT || 3020),
    databaseUrl: required('DATABASE_URL'),
    redisUrl: required('REDIS_URL'),
    sessionSecret: required('SESSION_SECRET'),
    isProd: process.env.NODE_ENV === 'production',
};
//# sourceMappingURL=config.js.map