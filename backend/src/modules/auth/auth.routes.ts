import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getCurrentUser, getUser, logout, registerUser } from './auth.service.js';
import { prisma } from '../../db/prisma.js';
import { validateBody } from '../../middleware/body-middleware.js';
import { createUserSchema } from '../users/users.schema.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
    const user: any = await getUser({ email: req.body.email });
    
    if(!user || !user.active || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({ message: "Login successful", user: { id: user.id, email: user.email, name: user.name, role: user.role } });
})

// Current session user, FE uses it after refresh
authRouter.get('/me', async (req, res) => {
    const user = req.session.userId ? await getCurrentUser(req.session.userId) : null;

    if(!user || !user.active) {
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