import { z } from "zod";

export const setOpenHoursSchema = z.object({
    
})

export const createServiceSchema = z.object({
    name: z.string().min(1, "Service name is required").max(100),
    categoryId: z.number().min(1, "Service category is required"),
    description: z.string().max(1000).default(""),
    duration: z.number().int().min(5, "Service duration must be at least 5 minutes").max(480, "Service duration must be at most 480 minutes"),
    active: z.boolean().default(true),
    price: z.number().min(0, "Service price must be at least 0").default(0),
})

export type createServiceSchema = z.infer<typeof createServiceSchema>;

export const categorySchema = z.object({
    name: z.string().trim().min(1, "Category name is required").max(50),
})

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format");

// Booking as the admin UI sees it: local date + time (Europe/Bratislava)
export const adminBookingSchema = z.object({
    serviceId: z.number().int().positive(),
    userId: z.uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    time,
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    email: z.union([z.email(), z.literal("")]),
    phone: z.string().trim().min(1).max(30),
    note: z.string().max(1000).default(""),
    status: z.enum(["confirmed", "pending", "completed", "cancelled"]),
})

export type AdminBookingInput = z.infer<typeof adminBookingSchema>;

export const monthQuerySchema = z.object({
    year: z.coerce.number().int().min(2000).max(3000).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
})

export const scheduleSchema = z.array(z.object({
    day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    label: z.string(),
    enabled: z.boolean(),
    open: time,
    close: time,
}).refine(day => !day.enabled || day.open < day.close, {
    message: "Closing time must be later than opening time",
})).length(7);

export const closureSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    reason: z.string().trim().min(1, "Reason is required").max(200),
})

export const updateMemberSchema = z.object({
    name: z.string().trim().min(1).max(50),
    email: z.email().transform(value => value.toLowerCase()),
    role: z.enum(["admin", "worker"]),
    active: z.boolean(),
    // Services this specialist offers; empty = all services
    serviceIds: z.array(z.number().int().positive()).optional(),
})

export const inviteMemberSchema = z.object({
    email: z.email().transform(value => value.toLowerCase()),
    name: z.string().trim().min(1).max(50),
    role: z.enum(["admin", "worker"]).default("worker"),
})

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
