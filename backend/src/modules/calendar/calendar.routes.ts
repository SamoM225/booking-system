import { Router } from 'express';
import { requireStaff, type Staff } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/body-middleware.js';
import { HttpError } from '../../lib/http-error.js';
import { parseId } from '../../lib/parse-id.js';
import { bookingSchema } from '../administration/bookings/bookings.schema.js';
import { moveBookingSchema, rangeQuerySchema, timeOffSchema } from './calendar.schema.js';
import {
    createCalendarBooking,
    createTimeOff,
    deleteCalendarBooking,
    deleteTimeOff,
    getCalendar,
    moveCalendarBooking,
    updateCalendarBooking,
    updateTimeOff
} from './calendar.service.js';

// Calendar for the whole team: admins see and manage everyone, workers only themselves
export const calendarRouter = Router();

calendarRouter.use(requireStaff);

const staffOf = (res: { locals: Record<string, unknown> }) => res.locals.staff as Staff;

calendarRouter.get('/', async (req, res) => {
    const query = rangeQuerySchema.safeParse(req.query);
    if (!query.success) {
        throw new HttpError(400, 'Invalid query');
    }
    res.json(await getCalendar(staffOf(res), query.data));
});

calendarRouter.post('/bookings', validateBody(bookingSchema), async (req, res) => {
    res.status(201).json(await createCalendarBooking(staffOf(res), req.body));
});

calendarRouter.put('/bookings/:id', validateBody(bookingSchema), async (req, res) => {
    res.json(await updateCalendarBooking(staffOf(res), parseId(req.params.id), req.body));
});

calendarRouter.patch('/bookings/:id/move', validateBody(moveBookingSchema), async (req, res) => {
    res.json(await moveCalendarBooking(staffOf(res), parseId(req.params.id), req.body));
});

calendarRouter.delete('/bookings/:id', async (req, res) => {
    res.json(await deleteCalendarBooking(staffOf(res), parseId(req.params.id)));
});

calendarRouter.post('/time-off', validateBody(timeOffSchema), async (req, res) => {
    res.status(201).json(await createTimeOff(staffOf(res), req.body));
});

calendarRouter.put('/time-off/:id', validateBody(timeOffSchema), async (req, res) => {
    res.json(await updateTimeOff(staffOf(res), parseId(req.params.id), req.body));
});

calendarRouter.delete('/time-off/:id', async (req, res) => {
    res.json(await deleteTimeOff(staffOf(res), parseId(req.params.id)));
});
