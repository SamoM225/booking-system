import { z } from "zod";
import { dateSchema, timeSchema } from "../admin.schema.js";

// Booking as the admin UI sees it: local date + time
export const bookingSchema = z.object({
    serviceId: z.number().int().positive(),
    userId: z.uuid(),
    date: dateSchema,
    time: timeSchema,
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    email: z.union([z.email(), z.literal("")]),
    phone: z.string().trim().min(1).max(30),
    note: z.string().max(1000).default(""),
    status: z.enum(["confirmed", "pending", "completed", "cancelled"]),
})

export type BookingInput = z.infer<typeof bookingSchema>;

// Optional ?year=2026&month=10
export const monthQuerySchema = z.object({
    year: z.coerce.number().int().min(2000).max(3000).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
})
