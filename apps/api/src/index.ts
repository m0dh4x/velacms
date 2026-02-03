import { auth } from '@vela/auth';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v1Routes } from './routes';
import { onError, onNotFound } from './middleware/error-handler';

const app = new Hono();

app.use(
	'*',
	cors({
		origin: 'http://localhost:5173',
		credentials: true,
	}),
);

app.onError(onError);
app.notFound(onNotFound);

app.get('/', (c) => c.json({ message: 'Vela CMS API' }));
app.get('/health', (c) => c.json({ status: 'ok' }));

// Auth routes (public)
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// Versioned API routes
app.route('/api/v1', v1Routes);

export default {
	port: 3000,
	fetch: app.fetch,
};

// oxlint-disable-next-line no-console
console.log('🚀 Vela CMS API running on http://localhost:3000');
