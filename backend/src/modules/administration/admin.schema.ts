import { z } from "zod";

export const setOpenHoursSchema = z.object({
    
})

export const createServiceSchema = z.object({
    name: z.string().min(1, "Service name is required"),
    categoryId: z.number().min(1, "Service category is required"),
    description: z.string().min(1, "Service description is required"),
    duration: z.number().min(1, "Service duration must be at least 1 minute"),
    available: z.boolean().default(true),
    price: z.number().min(0, "Service price must be at least 0"),
})

export type createServiceSchema = z.infer<typeof createServiceSchema>;