import { z } from "zod";

export const createUserSchema = z.object({
    // Stored lowercase, sign-in compares case-insensitively
    email: z.email().transform(value => value.toLowerCase()),
    name: z.string().min(2).max(50),
    password: z.string().min(6, "Password must be at least 6 characters long").max(100, "Password must be at most 100 characters long"),
})

export const loginSchema = z.object({
    email: z.email(),
    password: z.string(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>;