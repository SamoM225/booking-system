import { z } from 'zod';

export const createBookingSchema = z.object({
    first_name: z.string().min(1, "First name is required").max(50, "First name must be at most 50 characters long"),
    last_name: z.string().min(1, "Last name is required").max(50, "Last name must be at most 50 characters long"),
    email: z.email("Invalid email address"),
    phone_number: z.string(),
    ToS: z.boolean().refine((value) => value === true, {
        message: "You must accept the Terms of Service",
    }),
    datetime: z.string().refine((value) => {
        const date = new Date(value);
        return !isNaN(date.getTime());
    }, {
        message: "Invalid date format",
    }),
    serviceId: z.int().positive(),
    userId: z.uuid()
})


// Admin/worker routes will use this schema to list bookings for a specific user and optionally filter by service ID.


export type CreateBookingInput = z.infer<typeof createBookingSchema>;