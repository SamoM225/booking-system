import { z } from "zod";
import { dateSchema, timeSchema } from "../administration/admin.schema.js";

// Local date + time in one value: 2026-10-02T09:30
export const dateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Invalid date and time format");

// ?from=2026-09-28&to=2026-10-04&userId=... (both dates inclusive)
export const rangeQuerySchema = z.object({
    from: dateSchema,
    to: dateSchema,
    userId: z.uuid().optional(),
}).refine(range => range.from <= range.to, { message: "`from` must not be after `to`" });

// Drag & drop in the calendar: new start and optionally another specialist
export const moveBookingSchema = z.object({
    date: dateSchema,
    time: timeSchema,
    userId: z.uuid().optional(),
})

export const timeOffSchema = z.object({
    userId: z.uuid(),
    from: dateTimeSchema,
    // 24:00 is not a valid time, the end of a day is written as the next day's 00:00
    to: dateTimeSchema,
    reason: z.string().trim().max(200).default(""),
}).refine(range => range.from < range.to, { message: "End must be later than start" });

export type MoveBookingInput = z.infer<typeof moveBookingSchema>;
export type TimeOffInput = z.infer<typeof timeOffSchema>;
