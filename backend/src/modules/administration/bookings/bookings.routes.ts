import { Router } from 'express';
import { validateBody } from '../../../middleware/body-middleware.js';
import { HttpError } from '../../../lib/http-error.js';
import { parseId } from '../../../lib/parse-id.js';
import { bookingSchema, monthQuerySchema } from './bookings.schema.js';
import { createBooking, deleteBooking, getBookingsByMonth, updateBooking } from './bookings.service.js';

export const bookingsRouter = Router();

bookingsRouter.get('/', async (req, res) => {
    const query = monthQuerySchema.safeParse(req.query);
    if (!query.success) {
        throw new HttpError(400, 'Invalid query');
    }
    res.json(await getBookingsByMonth(query.data.year, query.data.month));
});

bookingsRouter.post('/', validateBody(bookingSchema), async (req, res) => {
    res.status(201).json(await createBooking(req.body));
});

bookingsRouter.put('/:id', validateBody(bookingSchema), async (req, res) => {
    res.json(await updateBooking(parseId(req.params.id), req.body));
});

bookingsRouter.delete('/:id', async (req, res) => {
    res.json(await deleteBooking(parseId(req.params.id)));
});
