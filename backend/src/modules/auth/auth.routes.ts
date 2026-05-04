import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getUser, logout, registerUser } from './auth.service.js';
import { prisma } from '../../db/prisma.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
    const user: any = await getUser({ email: req.body.email });
    
    if(!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({ message: "Login successful" });
})

authRouter.post('/register', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = await registerUser({ email: req.body.email, name: req.body.name, password: hashedPassword });
    res.json({ message: "User registered successfully", userId: newUser.id });
})

authRouter.post('/logout', (req, res) => {
    logout(req, res);
});