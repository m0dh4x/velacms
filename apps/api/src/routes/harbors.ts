import { Hono } from 'hono';
import { createHarbor, getHarborById, getHarborsByUser } from '../services/harbor.service';
import { HTTPException } from 'hono/http-exception';

type AuthVariables = {
	user: { id: string };
};

export const harborRoute = new Hono<{ Variables: AuthVariables }>();

harborRoute.get('/', (c) => {
	const userId = c.get('user').id;
	return c.json(getHarborsByUser(userId));
});

harborRoute.get('/:id', (c) => {
	const { id } = c.req.param();
	return c.json(getHarborById(id));
});

harborRoute.post('/', async (c) => {
	const { name, slug, organizationId } = await c.req.json();
	if (!name || !slug) throw new HTTPException(400, { message: 'Name and slug are required' });
	const userId = c.get('user').id;
	return c.json(createHarbor(slug, name, userId, organizationId), 201);
});
