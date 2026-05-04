import { Router } from "express";
import { validateBody } from "../../middleware/body-middleware.js";
import { createUserSchema } from "./users.schema.js";
import { createUser, listUsers } from "./users.service.js";
export const userRouter = Router();
// List all users, dev
userRouter.get('/', async (req, res) => {
    const users = await listUsers();
    res.json(users);
});
userRouter.post('/', validateBody(createUserSchema), async (req, res) => {
    const user = await createUser(req.body);
    res.status(201).json(user);
});
//# sourceMappingURL=users.routes.js.map