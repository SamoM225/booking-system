import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { availabilityRouter } from './availability/availability.routes.js';
import { bookingsRouter } from './bookings/bookings.routes.js';
import { categoriesRouter } from './categories/categories.routes.js';
import { closuresRouter } from './closures/closures.routes.js';
import { overviewRouter } from './overview/overview.routes.js';
import { servicesRouter } from './services/services.routes.js';
import { teamRouter } from './team/team.routes.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.use('/overview', overviewRouter);
adminRouter.use('/bookings', bookingsRouter);
adminRouter.use('/services', servicesRouter);
adminRouter.use('/categories', categoriesRouter);
adminRouter.use('/team', teamRouter);
adminRouter.use('/availability', availabilityRouter);
adminRouter.use('/closures', closuresRouter);
