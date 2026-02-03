import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const onError: ErrorHandler = (err, c) => {
	if (err instanceof HTTPException) {
		return c.json({ error: { status: err.status, message: err.message } }, err.status);
	}

	if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
		return c.json({ error: { status: 409, message: 'Resource already exists' } }, 409);
	}

	/* oxlint-disable-next-line no-console */
	console.error('Unhandled error:', err);
	return c.json({ error: { status: 500, message: 'Internal Server Error' } }, 500);
};

export const onNotFound: NotFoundHandler = (c) => {
	return c.json({ error: { status: 404, message: 'Not Found' } }, 404);
};
