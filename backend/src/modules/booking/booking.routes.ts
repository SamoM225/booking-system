import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { validateBody } from "../../middleware/body-middleware.js";
import brypt from 'bcrypt';
import { createBooking, listBookings } from "./booking.service.js";
import { createBookingSchema, type CreateBookingInput } from "./booking.schema.js";

export const bookingRouter = Router();

bookingRouter.get('/bookings', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    const bookingId = req.query.bookingId === undefined
        ? undefined
        : Number(req.query.bookingId);

    const bookings = await listBookings({
        userId,
        bookingId: Number.isNaN(bookingId) ? undefined : bookingId
    }, (req.session as typeof req.session & { isAdmin?: boolean }).isAdmin ?? false);
    res.json(bookings);
});

bookingRouter.post('/bookings', validateBody(createBookingSchema), async (req, res) => {
    const data: CreateBookingInput = req.body;

    const booking = await createBooking(data);
    res.status(201).json(booking);
})