import { z } from "zod";
import { timeSchema } from "../admin.schema.js";

export const scheduleSchema = z.array(z.object({
    day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    label: z.string(),
    enabled: z.boolean(),
    open: timeSchema,
    close: timeSchema,
}).refine(day => !day.enabled || day.open < day.close, {
    message: "Closing time must be later than opening time",
})).length(7);
