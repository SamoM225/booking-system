import { z } from 'zod';

export const createBookingSchema = z.object({
    first_name: z.string().min(1, "First name is required").max(50, "First name must be at most 50 characters long"),
    last_name: z.string().min(1, "Last name is required").max(50, "Last name must be at most 50 characters long"),
    email: z.email("Invalid email address"),
    phone_number: z.string().min(1, "Phone number is required").max(30),
    ToS: z.boolean().refine((value) => value === true, {
        message: "You must accept the Terms of Service",
    }),
    note: z.string().max(1000).default(""),
    // Local date and time in the business timezone (Europe/Bratislava)
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format"),
    serviceId: z.int().positive(),
    // The specialist the client chose
    userId: z.uuid()
})


// Admin/worker routes will use this schema to list bookings for a specific user and optionally filter by service ID.


export type CreateBookingInput = z.infer<typeof createBookingSchema>;