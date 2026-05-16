import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../db/prisma.js';
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

    it('accepts the e-mail in any letter case', async () => {
        assert.equal((await client(server.url).login('Admin@Test.Local')).status, 200);
    });

    it('stores registered e-mails lowercase and refuses the same address in another case', async () => {
        const created = await client(server.url).post('/auth/register', { name: 'Cora Customer', email: 'Cora@Example.com', password: 'cora-password' });
        assert.equal(created.status, 201);
        assert.equal((await client(server.url).login('cora@example.com', 'cora-password')).status, 200);

        const duplicate = await client(server.url).post('/auth/register', { name: 'Cora Again', email: 'CORA@example.com', password: 'other-password' });
        assert.equal(duplicate.status, 409);
    });

    it('treats _ and % in an e-mail as plain characters', async () => {
        // 'adm_n@test.local' must not match 'admin@test.local' (ILIKE would treat _ as a wildcard)
        assert.equal((await client(server.url).login('adm_n@test.local')).status, 401);
        assert.equal((await client(server.url).login('%@test.local')).status, 401);
        const created = await client(server.url).post('/auth/register', { name: 'Other Person', email: 'adm_n@test.local', password: 'other-password' });
        assert.equal(created.status, 201);
    });

    it('starts a new session id on sign-in', async () => {
        const browser = client(server.url);
        await browser.login('worker@test.local');
        const first = browser.cookie();
        await browser.login('worker@test.local');
        assert.notEqual(browser.cookie(), first);
    });

    it('signs out a member as soon as they are deactivated or demoted', async () => {
        const team = client(server.url);
        await team.login('admin@test.local');
        const demoted = client(server.url);
        await demoted.login('admin@test.local');

        // A second admin, so the last active admin is not the one being changed
        await prisma.user.create({ data: { email: 'second@test.local', name: 'Second Admin', role: 'admin', password: 'x' } });
        const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@test.local' } });

        await prisma.user.update({ where: { id: admin.id }, data: { role: 'worker' } });
        assert.equal((await demoted.get('/admin/team')).status, 403);
        assert.equal((await demoted.get('/auth/me')).body.role, 'worker');

        await prisma.user.update({ where: { id: admin.id }, data: { active: false } });
        assert.equal((await demoted.get('/auth/me')).status, 401);
        assert.equal((await team.get('/admin/team')).status, 403);
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
