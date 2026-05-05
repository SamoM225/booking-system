import { Router } from 'express';
import { validateBody } from '../../../middleware/body-middleware.js';
import { parseId } from '../../../lib/parse-id.js';
import { closureSchema } from './closures.schema.js';
import { createClosure, deleteClosure, getClosures } from './closures.service.js';

export const closuresRouter = Router();

closuresRouter.get('/', async (req, res) => {
    res.json(await getClosures());
});

closuresRouter.post('/', validateBody(closureSchema), async (req, res) => {
    res.status(201).json(await createClosure(req.body));
});

closuresRouter.delete('/:id', async (req, res) => {
    res.json(await deleteClosure(parseId(req.params.id)));
});
