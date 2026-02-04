import { Hono } from 'hono';
import { harborRoute } from './harbors';
import { authMiddleware } from '../middleware/auth';

export const v1Routes = new Hono();

v1Routes.get('/health', (c) => c.json({ status: 'v1 ok' }));

v1Routes.use('*', authMiddleware);
v1Routes.route('/harbors', harborRoute);
