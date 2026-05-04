import { Router } from 'express';
import type { Request, Response } from 'express';
import { setOpenHours } from './admin.service.js';


export const adminRouter = Router();

adminRouter.use('/open-hours', async (req: Request, res: Response) => {
    if(req.session.userId === undefined) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { day, openTime, closeTime } = req.body;

    if(req.session.userId !== req.body.userId && req.session.role === 'admin'){
        const userId: string | null = req.body.userId || null;
        const result = await setOpenHours({ day, openTime, closeTime }, userId);
        return res.json(result);
    }
    
    const userId: string | null = req.body.userId || null;

    const result = await setOpenHours({ day, openTime, closeTime }, userId);
    res.json(result);
});
