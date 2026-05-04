import { Router } from 'express';
import type { Request, Response } from 'express';
import { getBookingsByMonth, getServices, overview, setOpenHours } from './admin.service.js';
import { requireAdmin } from '../../middleware/auth.js';


export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.use('/open-hours', async (req: Request, res: Response) => {
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



adminRouter.use('/overview', async (req: Request, res: Response) => {
    const result = await overview();
    res.json(result);
});

adminRouter.use('/bookings', async (req: Request, res: Response) => {
    const { year, month } = req.body;

    const result = await getBookingsByMonth(year, month);
    res.json(result);
});

adminRouter.use('/services', async (req: Request, res: Response) => {
    const result = await getServices();
    res.json(result);
});