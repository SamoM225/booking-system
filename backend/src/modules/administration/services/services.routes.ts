import { Router } from 'express';
import { validateBody } from '../../../middleware/body-middleware.js';
import { parseId } from '../../../lib/parse-id.js';
import { serviceSchema } from './services.schema.js';
import { createService, deleteService, getServices, updateService } from './services.service.js';

export const servicesRouter = Router();

servicesRouter.get('/', async (req, res) => {
    res.json(await getServices());
});

servicesRouter.post('/', validateBody(serviceSchema), async (req, res) => {
    res.status(201).json(await createService(req.body));
});

servicesRouter.put('/:id', validateBody(serviceSchema), async (req, res) => {
    res.json(await updateService(parseId(req.params.id), req.body));
});

servicesRouter.delete('/:id', async (req, res) => {
    res.json(await deleteService(parseId(req.params.id)));
});
