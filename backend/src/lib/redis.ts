import { Redis } from "ioredis";
import { config } from "../config.js";

// Fail a request after a few retries instead of hanging when Redis is unreachable.
export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });

redis.on('error', (err: Error) => {
    console.error('Redis error:', err);
});