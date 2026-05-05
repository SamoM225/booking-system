import { Router } from 'express';
import type { Request, Response } from 'express';
import {
    createBooking, createCategory, createClosure, createService, deleteBooking, deleteCategory, deleteClosure, deleteService,
    getBookingsByMonth, getCategories, getClosures, getMembers, getSchedules, getServices, inviteMember, overview,
    setOpenHours, updateBooking, updateCategory, updateMember, updateSchedule, updateService
} from './admin.service.js';
import { validateBody } from '../../middleware/body-middleware.js';
import {
    adminBookingSchema, categorySchema, closureSchema, createServiceSchema, inviteMemberSchema, monthQuerySchema,
    scheduleSchema, updateMemberSchema
} from './admin.schema.js';
import { requireAdmin } from '../../middleware/auth.js';


export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.post('/open-hours', async (req: Request, res: Response) => {
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




adminRouter.get('/overview', async (req: Request, res: Response) => {
    const result = await overview();
    res.json(result);
});

// Optional ?year=2026&month=10, without it returns every booking
adminRouter.get('/bookings', async (req: Request, res: Response) => {
    const query = monthQuerySchema.safeParse(req.query);
    if (!query.success) {
        return res.status(400).json({ message: 'Invalid query' });
    }

    const result = await getBookingsByMonth(query.data.year, query.data.month);
    res.json(result);
});

adminRouter.post('/bookings/create', validateBody(adminBookingSchema), async (req: Request, res: Response) => {
    const result = await createBooking(req.body);
    res.status(201).json(result);
});

adminRouter.post('/bookings/update/:id', validateBody(adminBookingSchema), async (req: Request, res: Response) => {
    const result = await updateBooking(Number(req.params.id), req.body);
    res.json(result);
});

adminRouter.delete('/bookings/delete/:id', async (req: Request, res: Response) => {
    const result = await deleteBooking(Number(req.params.id));
    res.json(result);
});

adminRouter.get('/services', async (req: Request, res: Response) => {
    const result = await getServices();
    res.json(result);
});

adminRouter.post('/services/create', validateBody(createServiceSchema), async (req: Request, res: Response) => {
    const result = await createService(req.body);
    res.json(result);
});

adminRouter.post('/services/update/:id', validateBody(createServiceSchema), async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const result = await updateService(id, req.body);
    res.json(result);
});

adminRouter.delete('/services/delete/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await deleteService(id);
    res.json(result);
});

adminRouter.get('/categories', async (req: Request, res: Response) => {
    res.json(await getCategories());
});

adminRouter.post('/categories/create', validateBody(categorySchema), async (req: Request, res: Response) => {
    res.status(201).json(await createCategory(req.body.name));
});

adminRouter.post('/categories/update/:id', validateBody(categorySchema), async (req: Request, res: Response) => {
    res.json(await updateCategory(Number(req.params.id), req.body.name));
});

adminRouter.delete('/categories/delete/:id', async (req: Request, res: Response) => {
    res.json(await deleteCategory(Number(req.params.id)));
});

adminRouter.get('/team', async (req: Request, res: Response) => {
    res.json(await getMembers());
});

adminRouter.post('/team/update/:id', validateBody(updateMemberSchema), async (req: Request, res: Response) => {
    res.json(await updateMember(String(req.params.id), req.body));
});

// Invite logic is up to you, see inviteMember in admin.service.ts
adminRouter.post('/team/invite', validateBody(inviteMemberSchema), async (req: Request, res: Response) => {
    res.status(201).json(await inviteMember(req.body));
});

// All weekly schedules, keyed by user id
adminRouter.get('/availability', async (req: Request, res: Response) => {
    res.json(await getSchedules());
});

adminRouter.post('/availability/:userId', validateBody(scheduleSchema), async (req: Request, res: Response) => {
    res.json(await updateSchedule(String(req.params.userId), req.body));
});

adminRouter.get('/closures', async (req: Request, res: Response) => {
    res.json(await getClosures());
});

adminRouter.post('/closures/create', validateBody(closureSchema), async (req: Request, res: Response) => {
    res.status(201).json(await createClosure(req.body));
});

adminRouter.delete('/closures/delete/:id', async (req: Request, res: Response) => {
    res.json(await deleteClosure(Number(req.params.id)));
});
