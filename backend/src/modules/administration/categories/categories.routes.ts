import { Router } from 'express';
import { validateBody } from '../../../middleware/body-middleware.js';
import { parseId } from '../../../lib/parse-id.js';
import { categorySchema } from './categories.schema.js';
import { createCategory, deleteCategory, getCategories, updateCategory } from './categories.service.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res) => {
    res.json(await getCategories());
});

categoriesRouter.post('/', validateBody(categorySchema), async (req, res) => {
    res.status(201).json(await createCategory(req.body.name));
});

categoriesRouter.put('/:id', validateBody(categorySchema), async (req, res) => {
    res.json(await updateCategory(parseId(req.params.id), req.body.name));
});

categoriesRouter.delete('/:id', async (req, res) => {
    res.json(await deleteCategory(parseId(req.params.id)));
});
