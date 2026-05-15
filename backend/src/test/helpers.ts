import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import { outbox } from '../lib/mailer.js';
import { redis } from '../lib/redis.js';

// Integration test helpers: `npm test` runs against the booking_cv_test database from .env.test

export const PASSWORD = 'secret123';

export async function startServer() {
    const server = await new Promise<Server>((resolve) => {
        const instance = createApp().listen(0, () => resolve(instance));
    });
    const { port } = server.address() as AddressInfo;
    return {
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    };
}

export interface ApiResponse<T> {
    status: number
    body: T
}

/** fetch with its own cookie jar, i.e. one browser with its own session. */
export function client(baseUrl: string) {
    let cookie = '';

    async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
        const res = await fetch(baseUrl + path, {
            method,
            headers: {
                ...(body === undefined ? {} : { 'content-type': 'application/json' }),
                ...(cookie ? { cookie } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const session = res.headers.getSetCookie().find(value => value.startsWith('connect.sid='));
        if (session) cookie = session.split(';')[0]!;
        const text = await res.text();
        return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
    }

    return {
        get: <T = any>(path: string) => request<T>('GET', path),
        post: <T = any>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
        put: <T = any>(path: string, body: unknown) => request<T>('PUT', path, body),
        patch: <T = any>(path: string, body: unknown) => request<T>('PATCH', path, body),
        delete: <T = any>(path: string) => request<T>('DELETE', path),
        login: (email: string, password = PASSWORD) => request<any>('POST', '/auth/login', { email, password }),
        /** The session cookie this client currently sends */
        cookie: () => cookie,
    };
}

export async function resetDatabase() {
    await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "Bookings", "userAvailability", "Unavailable", "Invitation", "_ServiceToUser", "Service", "Category", "users" RESTART IDENTITY CASCADE'
    );
    outbox.length = 0;
}

/** An admin, two workers and one 60-minute service. */
export async function seed() {
    const password = await bcrypt.hash(PASSWORD, 4);
    const admin = await prisma.user.create({ data: { email: 'admin@test.local', name: 'Ada Admin', role: 'admin', password } });
    const worker = await prisma.user.create({ data: { email: 'worker@test.local', name: 'Walt Worker', role: 'worker', password } });
    const other = await prisma.user.create({ data: { email: 'other@test.local', name: 'Olga Other', role: 'worker', password } });
    const category = await prisma.category.create({ data: { name: 'Haircut' } });
    const service = await prisma.service.create({ data: { name: 'Cut', duration: 60, price: 30, categoryId: category.id } });
    return { admin, worker, other, service };
}

export function bookingBody(input: { serviceId: number, userId: string, date: string, time: string }) {
    return { ...input, firstName: 'Jana', lastName: 'Test', email: '', phone: '0900 000 000', note: '', status: 'confirmed' };
}

export async function shutdown() {
    await prisma.$disconnect();
    redis.disconnect();
}
