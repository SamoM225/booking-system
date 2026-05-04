import { Router } from 'express';
import { validateBody } from '../../middleware/body-middleware.js';
import { getSlots } from '../booking/scheduling.js';
import { availabilityQuerySchema, contactSchema } from './public.schema.js';
import { listActiveServices, listCategories, listWorkers, sendContactMessage } from './public.service.js';

export const publicRouter = Router();

const optionalId = (value: unknown) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : undefined;
};

publicRouter.get('/categories', async (req, res) => {
    res.json(await listCategories());
});

publicRouter.get('/services', async (req, res) => {
    res.json(await listActiveServices(optionalId(req.query.categoryId)));
});

publicRouter.get('/workers', async (req, res) => {
    res.json(await listWorkers(optionalId(req.query.serviceId)));
});

// Free start times (HH:mm) for a specialist, service and day
publicRouter.get('/availability', async (req, res) => {
    const query = availabilityQuerySchema.safeParse(req.query);
    if (!query.success) {
        return res.status(400).json({ message: 'Invalid query' });
    }
    res.json(await getSlots(query.data));
});

publicRouter.post('/contact', validateBody(contactSchema), async (req, res) => {
    await sendContactMessage(req.body);
    res.status(201).json({ message: 'Message sent' });
});
