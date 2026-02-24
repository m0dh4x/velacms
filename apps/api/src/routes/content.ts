import { Hono } from 'hono';
import { harborGuard } from '../middleware/harborGuard';
import { createContentSchema, updateContentSchema } from '../schemas/content';
import {
	createContent,
	updateContent,
	deleteContent,
	getContentByHarbor,
	getContentById,
	publishContent,
	unpublishContent,
} from '../services/content';
import z from 'zod';

type AuthVariables = {
	user: { id: string };
	harborMember: {
		roleId: string;
		isOwner: boolean;
		permissions: Record<string, unknown>;
	};
};

export const contentRoute = new Hono<{ Variables: AuthVariables }, {}, '/:harborId/content'>();

contentRoute.use('*', harborGuard);

contentRoute.get('/', (c) => {
	const { harborId } = c.req.param();
	return c.json(getContentByHarbor(harborId));
});

contentRoute.get('/:contentId', (c) => {
	const { harborId, contentId } = c.req.param();
	return c.json(getContentById(harborId, contentId));
});

contentRoute.post('/', async (c) => {
	const { harborId } = c.req.param();
	const userId = c.get('user').id;
	const body = await c.req.json();

	const parsedContent = createContentSchema.safeParse(body);

	if (!parsedContent.success) {
		return c.json(
			{ error: 'Validation failed', details: z.flattenError(parsedContent.error) },
			400,
		);
	}
	return c.json(createContent(harborId, parsedContent.data, userId), 201);
});

contentRoute.put('/:contentId', async (c) => {
	const { harborId, contentId } = c.req.param();
	const userId = c.get('user').id;
	const body = await c.req.json();

	const parsedContent = updateContentSchema.safeParse(body);

	if (!parsedContent.success) {
		return c.json(
			{ error: 'Validation failed', details: z.flattenError(parsedContent.error) },
			400,
		);
	}
	return c.json(updateContent(harborId, contentId, parsedContent.data, userId), 200);
});

contentRoute.post('/:contentId/publish', (c) => {
	const { harborId, contentId } = c.req.param();
	const userId = c.get('user').id;

	return c.json(publishContent(harborId, contentId, userId), 200);
});

contentRoute.post('/:contentId/unpublish', (c) => {
	const { harborId, contentId } = c.req.param();
	const userId = c.get('user').id;

	return c.json(unpublishContent(harborId, contentId, userId), 200);
});

contentRoute.delete('/:contentId', (c) => {
	const { harborId, contentId } = c.req.param();
	const userId = c.get('user').id;

	deleteContent(harborId, contentId, userId);
	return c.body(null, 204);
});
