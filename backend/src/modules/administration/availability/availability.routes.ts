import { Router } from 'express';
import { validateBody } from '../../../middleware/body-middleware.js';
import { scheduleSchema } from './availability.schema.js';
import { getSchedules, updateSchedule } from './availability.service.js';

export const availabilityRouter = Router();

availabilityRouter.get('/', async (req, res) => {
    res.json(await getSchedules());
});

availabilityRouter.put('/:userId', validateBody(scheduleSchema), async (req, res) => {
    res.json(await updateSchedule(String(req.params.userId), req.body));
});
