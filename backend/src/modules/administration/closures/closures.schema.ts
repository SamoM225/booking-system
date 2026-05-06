import { z } from "zod";
import { dateSchema } from "../admin.schema.js";

export const closureSchema = z.object({
    date: dateSchema,
    reason: z.string().trim().min(1, "Reason is required").max(200),
})

export type ClosureInput = z.infer<typeof closureSchema>;
