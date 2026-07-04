import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../../config.js';
import { resetDemo } from '../../demo/reset.js';

export const cronRouter = Router();

// Vercel Cron calls this every night (backend/vercel.json) with "Authorization: Bearer <CRON_SECRET>"
cronRouter.get('/reset-demo', async (req, res) => {
    if (!config.demoMode || !config.cronSecret) {
        return res.status(404).json({ message: 'Not found' });
    }
    const expected = Buffer.from(`Bearer ${config.cronSecret}`);
    const given = Buffer.from(req.get('authorization') ?? '');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    res.json(await resetDemo());
});
