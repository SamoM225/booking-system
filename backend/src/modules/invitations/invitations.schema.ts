import { z } from "zod";

export const acceptInvitationSchema = z.object({
    name: z.string().trim().min(2).max(50),
    password: z.string().min(6, "Password must be at least 6 characters long").max(100, "Password must be at most 100 characters long"),
})

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
