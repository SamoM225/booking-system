import { z } from "zod";

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
