import { z } from "zod";

// Shared building blocks for the admin schemas (local date + time, Europe/Bratislava)
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format");
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");
