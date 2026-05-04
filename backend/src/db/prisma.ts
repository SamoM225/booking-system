import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../config.js";

const adapter = new PrismaPg({ connectionString: config.databaseUrl });
console.log('DATABASE_URL =', config.databaseUrl)
console.log('REDIS_URL =', config.redisUrl)

export const prisma = new PrismaClient({ adapter,
    omit: {
        user: {
            password: true // Omit the password field from the user model
        }
    }
 });