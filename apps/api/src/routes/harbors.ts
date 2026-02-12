import { Hono } from 'hono';
import {
	createHarbor,
	deleteHarbor,
	getHarborById,
	getHarborsByUser,
	updateHarbor,
} from '../services/harbor.service';
import { HTTPException } from 'hono/http-exception';
import { harborGuard } from '../middleware/harborGuard';

type AuthVariables = {
	user: { id: string };
	harborMember: {
		roleId: string;
		isOwner: boolean;
		permissions: Record<string, unknown>;
	};
};

export const harborRoute = new Hono<{ Variables: AuthVariables }>();

harborRoute.get('/', (c) => {
	const userId = c.get('user').id;
	return c.json(getHarborsByUser(userId));
});

harborRoute.get('/:id', harborGuard, (c) => {
	const { id } = c.req.param();
	return c.json(getHarborById(id));
});

harborRoute.post('/', async (c) => {
	const { name, slug, organizationId } = await c.req.json();
	if (!name || !slug) throw new HTTPException(400, { message: 'Name and slug are required' });
	const userId = c.get('user').id;
	return c.json(createHarbor(slug, name, userId, organizationId), 201);
});

harborRoute.put('/:id', harborGuard, async (c) => {
	const id = c.req.param('id');
	const { name, settings } = await c.req.json();
	const userId = c.get('user').id;
	if (name === undefined && settings === undefined) {
		throw new HTTPException(400, { message: 'At least one field (name, settings) is required' });
	}
	return c.json(updateHarbor(id, { name, settings }, userId));
});

harborRoute.delete('/:id', harborGuard, (c) => {
	const id = c.req.param('id');
	const userId = c.get('user').id;
	const member = c.get('harborMember');
	if (!member.isOwner) {
		throw new HTTPException(403, { message: 'Only the owner can delete this harbor' });
	}

	deleteHarbor(id, userId);
	return c.body(null, 204);
});
