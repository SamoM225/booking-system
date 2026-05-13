import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.js';
import { outbox } from '../../lib/mailer.js';
import { client, resetDatabase, seed, shutdown, startServer } from '../../test/helpers.js';

const tokenFrom = (text: string) => text.match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1] ?? '';

describe('invitations', () => {
    let server: Awaited<ReturnType<typeof startServer>>;
    let admin: ReturnType<typeof client>;

    before(async () => {
        server = await startServer();
    });
    beforeEach(async () => {
        await resetDatabase();
        await seed();
        admin = client(server.url);
        await admin.login('admin@test.local');
    });
    after(async () => {
        await server.close();
        await shutdown();
    });

    async function invite(email = 'New.Person@Example.com', name = 'New Person', role = 'worker') {
        const res = await admin.post('/admin/team/invite', { email, name, role });
        return { res, token: tokenFrom(outbox.at(-1)?.text ?? '') };
    }

    it('can only be sent by an administrator', async () => {
        const worker = client(server.url);
        await worker.login('worker@test.local');
        const res = await worker.post('/admin/team/invite', { email: 'x@example.com', name: 'X Y', role: 'worker' });
        assert.equal(res.status, 403);
        assert.equal(outbox.length, 0);
    });

    it('e-mails a one-time link and lists the invitation as pending', async () => {
        const { res, token } = await invite();
        assert.equal(res.status, 201);
        assert.equal(res.body.email, 'new.person@example.com');
        assert.equal(res.body.invitedBy, 'Ada Admin');

        assert.equal(outbox.length, 1);
        const mail = outbox[0]!;
        assert.equal(mail.to, 'new.person@example.com');
        assert.match(mail.text, /Ada Admin has invited you to join the Booking team as specialist/);
        assert.match(mail.html, new RegExp(`http://localhost:3000/invite/${token}`));
        assert.ok(token.length >= 40, 'token should be long and random');

        // Only a hash of the token is stored
        const stored = await prisma.invitation.findFirstOrThrow();
        assert.notEqual(stored.tokenHash, token);
        assert.ok(!JSON.stringify(stored).includes(token));

        const pending = await admin.get('/admin/team/invitations');
        assert.equal(pending.body.length, 1);
        assert.equal(pending.body[0].expired, false);
    });

    it('escapes what the admin typed in the e-mail', async () => {
        await invite('x@example.com', '<script>alert(1)</script>');
        assert.ok(!outbox[0]!.html.includes('<script>alert(1)</script>'));
        assert.ok(outbox[0]!.html.includes('&lt;script&gt;'));
    });

    it('refuses people who are already in the team', async () => {
        const { res } = await invite('WORKER@test.local', 'Walt Worker');
        assert.equal(res.status, 409);
        assert.equal(outbox.length, 0);
    });

    it('shows the invitation on the public link', async () => {
        const { token } = await invite();
        const res = await client(server.url).get(`/invitations/${token}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.name, 'New Person');
        assert.equal(res.body.role, 'worker');
        assert.equal(res.body.hasAccount, false);

        assert.equal((await client(server.url).get('/invitations/not-a-real-token')).status, 404);
    });

    it('creates the account, signs the person in and cannot be used twice', async () => {
        const { token } = await invite();
        const browser = client(server.url);

        assert.equal((await browser.post(`/invitations/${token}/accept`, { name: 'New Person', password: '123' })).status, 400);

        const accepted = await browser.post(`/invitations/${token}/accept`, { name: 'New Person', password: 'brand-new-pw' });
        assert.equal(accepted.status, 201);
        assert.equal(accepted.body.user.role, 'worker');

        const me = await browser.get('/auth/me');
        assert.equal(me.body.email, 'new.person@example.com');
        assert.equal((await browser.get('/calendar?from=2030-01-07&to=2030-01-07')).status, 200);

        assert.equal((await client(server.url).login('new.person@example.com', 'brand-new-pw')).status, 200);
        assert.equal((await client(server.url).post(`/invitations/${token}/accept`, { name: 'Again', password: 'another-pw' })).status, 410);
        assert.equal((await admin.get('/admin/team/invitations')).body.length, 0);
    });

    it('accepts a link only once even when it is used twice at the same moment', async () => {
        const { token } = await invite();
        const results = await Promise.all([
            client(server.url).post(`/invitations/${token}/accept`, { name: 'First', password: 'password-1' }),
            client(server.url).post(`/invitations/${token}/accept`, { name: 'Second', password: 'password-2' }),
        ]);
        assert.deepEqual(results.map(result => result.status).sort(), [201, 410]);
        assert.equal(await prisma.user.count({ where: { email: 'new.person@example.com' } }), 1);
    });

    it('expires after its validity', async () => {
        const { token } = await invite();
        await prisma.invitation.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
        assert.equal((await client(server.url).get(`/invitations/${token}`)).status, 410);
        assert.equal((await client(server.url).post(`/invitations/${token}/accept`, { name: 'Late', password: 'password-1' })).status, 410);
        assert.equal((await admin.get('/admin/team/invitations')).body[0].expired, true);
    });

    it('resending replaces the link', async () => {
        const { res, token: first } = await invite();
        const resent = await admin.post(`/admin/team/invitations/${res.body.id}/resend`);
        assert.equal(resent.status, 200);
        assert.equal(outbox.length, 2);
        const second = tokenFrom(outbox[1]!.text);
        assert.notEqual(first, second);

        assert.equal((await client(server.url).get(`/invitations/${first}`)).status, 404);
        assert.equal((await client(server.url).get(`/invitations/${second}`)).status, 200);
    });

    it('inviting the same address again keeps a single pending invitation', async () => {
        const { token: first } = await invite();
        await invite('new.person@example.com', 'New Person', 'admin');
        const pending = await admin.get('/admin/team/invitations');
        assert.equal(pending.body.length, 1);
        assert.equal(pending.body[0].role, 'admin');
        assert.equal((await client(server.url).get(`/invitations/${first}`)).status, 404);
    });

    it('can be revoked', async () => {
        const { res, token } = await invite();
        assert.equal((await admin.delete(`/admin/team/invitations/${res.body.id}`)).status, 200);
        assert.equal((await client(server.url).get(`/invitations/${token}`)).status, 404);
        assert.equal((await admin.delete(`/admin/team/invitations/${res.body.id}`)).status, 404);
    });

    it('promotes an existing customer account and sets the new password', async () => {
        await prisma.user.create({ data: { email: 'customer@example.com', name: 'Cora Customer', password: await bcrypt.hash('old-password', 4) } });
        const { token } = await invite('customer@example.com', 'Cora Customer', 'admin');
        assert.equal((await client(server.url).get(`/invitations/${token}`)).body.hasAccount, true);

        const accepted = await client(server.url).post(`/invitations/${token}/accept`, { name: 'Cora Customer', password: 'new-password' });
        assert.equal(accepted.status, 201);
        assert.equal(accepted.body.user.role, 'admin');
        assert.equal(await prisma.user.count({ where: { email: 'customer@example.com' } }), 1);
        assert.equal((await client(server.url).login('customer@example.com', 'old-password')).status, 401);
        assert.equal((await client(server.url).login('customer@example.com', 'new-password')).status, 200);
    });
});
