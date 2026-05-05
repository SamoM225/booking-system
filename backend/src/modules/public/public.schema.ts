import { z } from 'zod';

export const availabilityQuerySchema = z.object({
    userId: z.uuid(),
    serviceId: z.coerce.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

export const contactSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.email(),
    subject: z.string().min(1).max(150),
    message: z.string().min(10).max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;
