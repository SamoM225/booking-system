import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getUser, logout, registerUser } from './auth.service.js';
import { validateBody } from '../../middleware/body-middleware.js';
import { signIn, userOf } from '../../middleware/auth.js';
import { createUserSchema } from '../users/users.schema.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
    const user = await getUser({ email: req.body.email });

    if(!user || !user.active || !(await bcrypt.compare(String(req.body.password ?? ''), user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    await signIn(req, user);

    res.json({ message: "Login successful", user: { id: user.id, email: user.email, name: user.name, role: user.role } });
})

// Current session user, FE uses it after refresh (loaded by the currentUser middleware)
authRouter.get('/me', async (req, res) => {
    const user = userOf(res);

    if(!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
})

authRouter.post('/register', validateBody(createUserSchema), async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = await registerUser({ email: req.body.email, name: req.body.name, password: hashedPassword });
    res.status(201).json({ message: "User registered successfully", userId: newUser.id });
})

authRouter.post('/logout', (req, res) => {
    logout(req, res);
});
