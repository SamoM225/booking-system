import { z } from "zod";

export const serviceSchema = z.object({
    name: z.string().min(1, "Service name is required").max(100),
    categoryId: z.number().min(1, "Service category is required"),
    description: z.string().max(1000).default(""),
    duration: z.number().int().min(5, "Service duration must be at least 5 minutes").max(480, "Service duration must be at most 480 minutes"),
    active: z.boolean().default(true),
    price: z.number().min(0, "Service price must be at least 0").default(0),
})

export type ServiceInput = z.infer<typeof serviceSchema>;
