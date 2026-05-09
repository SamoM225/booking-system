import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { bookingBody, client, resetDatabase, seed, shutdown, startServer } from '../../test/helpers.js';

// 2030-01-07 is a Monday, inside the default working hours (Mon-Fri 09:00-17:00) and far from "now"
const DAY = '2030-01-07';

describe('calendar', () => {
    let server: Awaited<ReturnType<typeof startServer>>;
    let team: Awaited<ReturnType<typeof seed>>;
    let admin: ReturnType<typeof client>;
    let worker: ReturnType<typeof client>;

    before(async () => {
        server = await startServer();
    });
    beforeEach(async () => {
        await resetDatabase();
        team = await seed();
        admin = client(server.url);
        worker = client(server.url);
        await admin.login('admin@test.local');
        await worker.login('worker@test.local');
    });
    after(async () => {
        await server.close();
        await shutdown();
    });

    const range = `from=${DAY}&to=${DAY}`;

    it('is for team members only', async () => {
        const anonymous = await client(server.url).get(`/calendar?${range}`);
        assert.equal(anonymous.status, 403);
    });

    it('shows a worker only their own calendar', async () => {
        await admin.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.other.id, date: DAY, time: '10:00' }));
        await admin.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.worker.id, date: DAY, time: '11:00' }));

        const own = await worker.get(`/calendar?${range}`);
        assert.equal(own.status, 200);
        assert.deepEqual(own.body.members.map((member: { id: string }) => member.id), [team.worker.id]);
        assert.deepEqual(own.body.bookings.map((booking: { userId: string }) => booking.userId), [team.worker.id]);

        assert.equal((await worker.get(`/calendar?${range}&userId=${team.other.id}`)).status, 403);
    });

    it('shows an admin the whole team and can filter one specialist', async () => {
        await admin.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.other.id, date: DAY, time: '10:00' }));
        const all = await admin.get(`/calendar?${range}`);
        assert.equal(all.body.members.length, 3);
        assert.equal(all.body.bookings.length, 1);

        const filtered = await admin.get(`/calendar?${range}&userId=${team.worker.id}`);
        assert.equal(filtered.body.bookings.length, 0);
    });

    it('rejects an invalid range', async () => {
        assert.equal((await admin.get('/calendar?from=2030-01-08&to=2030-01-07')).status, 400);
        assert.equal((await admin.get('/calendar?from=tomorrow&to=2030-01-07')).status, 400);
    });

    it('lets a worker manage only their own bookings', async () => {
        const own = await worker.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.worker.id, date: DAY, time: '10:00' }));
        assert.equal(own.status, 201);
        const foreign = await worker.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.other.id, date: DAY, time: '10:00' }));
        assert.equal(foreign.status, 403);

        const othersBooking = await admin.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.other.id, date: DAY, time: '12:00' }));
        assert.equal((await worker.patch(`/calendar/bookings/${othersBooking.body.id}/move`, { date: DAY, time: '14:00' })).status, 403);
        // Moving one's own booking to a colleague is not allowed either
        assert.equal((await worker.patch(`/calendar/bookings/${own.body.id}/move`, { date: DAY, time: '14:00', userId: team.other.id })).status, 403);
    });

    it('moves a booking and refuses overlapping times', async () => {
        const first = await admin.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.worker.id, date: DAY, time: '10:00' }));
        const second = await admin.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.worker.id, date: DAY, time: '12:00' }));

        const moved = await worker.patch(`/calendar/bookings/${first.body.id}/move`, { date: '2030-01-08', time: '09:30' });
        assert.equal(moved.status, 200);
        assert.equal(moved.body.date, '2030-01-08');
        assert.equal(moved.body.time, '09:30');

        const overlap = await worker.patch(`/calendar/bookings/${second.body.id}/move`, { date: '2030-01-08', time: '10:00' });
        assert.equal(overlap.status, 409);
    });

    it('lets an admin move a booking to another specialist', async () => {
        const booking = await admin.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.worker.id, date: DAY, time: '10:00' }));
        const moved = await admin.patch(`/calendar/bookings/${booking.body.id}/move`, { date: DAY, time: '10:00', userId: team.other.id });
        assert.equal(moved.status, 200);
        assert.equal(moved.body.userId, team.other.id);
    });

    it('deletes bookings for administrators only', async () => {
        const booking = await worker.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.worker.id, date: DAY, time: '10:00' }));
        assert.equal((await worker.delete(`/calendar/bookings/${booking.body.id}`)).status, 403);
        assert.equal((await admin.delete(`/calendar/bookings/${booking.body.id}`)).status, 200);
    });

    describe('unavailability', () => {
        it('is created by a worker for themselves only', async () => {
            const own = await worker.post('/calendar/time-off', { userId: team.worker.id, from: `${DAY}T13:00`, to: `${DAY}T15:00`, reason: 'Doctor' });
            assert.equal(own.status, 201);
            assert.deepEqual(own.body, { id: own.body.id, userId: team.worker.id, from: `${DAY}T13:00`, to: `${DAY}T15:00`, reason: 'Doctor' });

            const foreign = await worker.post('/calendar/time-off', { userId: team.other.id, from: `${DAY}T13:00`, to: `${DAY}T15:00` });
            assert.equal(foreign.status, 403);
            assert.equal((await admin.post('/calendar/time-off', { userId: team.other.id, from: `${DAY}T13:00`, to: `${DAY}T15:00` })).status, 201);
        });

        it('needs an end after the start', async () => {
            const res = await worker.post('/calendar/time-off', { userId: team.worker.id, from: `${DAY}T15:00`, to: `${DAY}T13:00` });
            assert.equal(res.status, 400);
        });

        it('cannot overlap another unavailability or a booking', async () => {
            await worker.post('/calendar/time-off', { userId: team.worker.id, from: `${DAY}T13:00`, to: `${DAY}T15:00` });
            const overlap = await worker.post('/calendar/time-off', { userId: team.worker.id, from: `${DAY}T14:00`, to: `${DAY}T16:00` });
            assert.equal(overlap.status, 409);

            await worker.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.worker.id, date: DAY, time: '10:00' }));
            // The 60-minute booking runs until 11:00
            const overBooking = await worker.post('/calendar/time-off', { userId: team.worker.id, from: `${DAY}T10:30`, to: `${DAY}T12:00` });
            assert.equal(overBooking.status, 409);
            const afterBooking = await worker.post('/calendar/time-off', { userId: team.worker.id, from: `${DAY}T11:00`, to: `${DAY}T12:00` });
            assert.equal(afterBooking.status, 201);
        });

        it('blocks bookings and moves into it', async () => {
            await worker.post('/calendar/time-off', { userId: team.worker.id, from: `${DAY}T13:00`, to: `${DAY}T15:00` });
            const booking = await worker.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.worker.id, date: DAY, time: '09:00' }));

            const create = await worker.post('/calendar/bookings', bookingBody({ serviceId: team.service.id, userId: team.worker.id, date: DAY, time: '12:30' }));
            assert.equal(create.status, 409);
            const move = await worker.patch(`/calendar/bookings/${booking.body.id}/move`, { date: DAY, time: '14:00' });
            assert.equal(move.status, 409);
            assert.equal(move.body.message, 'This specialist is unavailable at this time');
        });

        it('removes the time from the public booking slots', async () => {
            await worker.post('/calendar/time-off', { userId: team.worker.id, from: `${DAY}T13:00`, to: `${DAY}T15:00` });
            const slots = await client(server.url).get<string[]>(`/public/availability?userId=${team.worker.id}&serviceId=${team.service.id}&date=${DAY}`);
            assert.equal(slots.status, 200);
            assert.ok(slots.body.includes('12:00'));
            for (const blocked of ['12:30', '13:00', '14:00', '14:30']) assert.ok(!slots.body.includes(blocked), `${blocked} should be blocked`);
            assert.ok(slots.body.includes('15:00'));
        });

        it('is shown for every day it covers', async () => {
            await worker.post('/calendar/time-off', { userId: team.worker.id, from: '2030-01-08T00:00', to: '2030-01-11T00:00', reason: 'Vacation' });
            const week = await worker.get('/calendar?from=2030-01-07&to=2030-01-13');
            assert.equal(week.body.timeOff.length, 1);
            const after = await worker.get('/calendar?from=2030-01-11&to=2030-01-13');
            assert.equal(after.body.timeOff.length, 0);
        });

        it('is moved, resized and removed by its owner only', async () => {
            const created = await worker.post('/calendar/time-off', { userId: team.worker.id, from: `${DAY}T13:00`, to: `${DAY}T15:00` });
            const moved = await worker.put(`/calendar/time-off/${created.body.id}`, { userId: team.worker.id, from: `${DAY}T14:00`, to: `${DAY}T16:30` });
            assert.equal(moved.status, 200);
            assert.equal(moved.body.to, `${DAY}T16:30`);

            const intruder = client(server.url);
            await intruder.login('other@test.local');
            assert.equal((await intruder.put(`/calendar/time-off/${created.body.id}`, { userId: team.other.id, from: `${DAY}T14:00`, to: `${DAY}T16:00` })).status, 403);
            assert.equal((await intruder.delete(`/calendar/time-off/${created.body.id}`)).status, 403);

            assert.equal((await worker.delete(`/calendar/time-off/${created.body.id}`)).status, 200);
            assert.equal((await worker.delete(`/calendar/time-off/${created.body.id}`)).status, 404);
        });
    });

    it('locks out a member as soon as they are deactivated', async () => {
        await admin.put(`/admin/team/${team.worker.id}`, { name: 'Walt Worker', email: 'worker@test.local', role: 'worker', active: false });
        assert.equal((await worker.get(`/calendar?${range}`)).status, 403);
    });
});
