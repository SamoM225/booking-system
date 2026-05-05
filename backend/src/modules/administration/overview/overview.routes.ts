import { Router } from 'express';
import { overview } from './overview.service.js';

export const overviewRouter = Router();

overviewRouter.get('/', async (req, res) => {
    res.json(await overview());
});
