import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { client, resetDatabase, seed, shutdown, startServer } from '../../test/helpers.js';

describe('auth', () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        server = await startServer();
    });
    beforeEach(async () => {
        await resetDatabase();
        await seed();
    });
    after(async () => {
        await server.close();
        await shutdown();
    });

    it('rejects a wrong password', async () => {
        const res = await client(server.url).login('admin@test.local', 'nope');
        assert.equal(res.status, 401);
    });

    it('signs in and keeps the session for /auth/me', async () => {
        const browser = client(server.url);
        const login = await browser.login('admin@test.local');
        assert.equal(login.status, 200);
        assert.equal(login.body.user.role, 'admin');
        assert.equal(login.body.user.password, undefined);

        const me = await browser.get('/auth/me');
        assert.equal(me.status, 200);
        assert.equal(me.body.email, 'admin@test.local');
    });

    it('signs out', async () => {
        const browser = client(server.url);
        await browser.login('worker@test.local');
        assert.equal((await browser.post('/auth/logout')).status, 200);
        assert.equal((await browser.get('/auth/me')).status, 401);
    });

    it('keeps the admin API for administrators only', async () => {
        const worker = client(server.url);
        await worker.login('worker@test.local');
        assert.equal((await worker.get('/admin/team')).status, 403);

        const admin = client(server.url);
        await admin.login('admin@test.local');
        assert.equal((await admin.get('/admin/team')).status, 200);
    });
});
