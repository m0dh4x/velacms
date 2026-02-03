import { Hono } from 'hono';

// v1 API routes
export const v1Routes = new Hono();

// Placeholder - we'll add routes here
v1Routes.get('/health', (c) => c.json({ status: 'v1 ok' }));
