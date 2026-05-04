import type { Request, Response, NextFunction } from "express";
import { z, type ZodType } from "zod";

export function validateBody(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if(!result.success) {
            return res.status(400).json({ message: "Validation failed", error: z.flattenError(result.error).fieldErrors });
        }

        req.body = result.data; 
        next();
    };
}