import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getUser, logout } from './auth.service.js';
export const authRouter = Router();
authRouter.post('/login', async (req, res) => {
    const user = await getUser({ email: req.body.email });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
    }
    req.session.userId = user.id;
    res.json({ message: "Login successful" });
});
authRouter.post('/logout', (req, res) => {
    logout(req, res);
});
//# sourceMappingURL=auth.routes.js.map