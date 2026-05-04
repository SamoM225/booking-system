import { z } from "zod";
export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ message: "Validation failed", error: z.flattenError(result.error).fieldErrors });
        }
        req.body = result.data;
        next();
    };
}
//# sourceMappingURL=body-middleware.js.map