import { Hono } from 'hono';
import { harborGuard } from '../middleware/harborGuard';
import { createBlueprintSchema, updateBlueprintSchema } from '../schemas/blueprint';
import {
	createBlueprint,
	deleteBlueprint,
	getBlueprintById,
	getBlueprintsByHarbor,
	updateBlueprint,
} from '../services/blueprint';

type AuthVariables = {
	user: { id: string };
	harborMember: {
		roleId: string;
		isOwner: boolean;
		permissions: Record<string, unknown>;
	};
};

export const blueprintRoute = new Hono<{ Variables: AuthVariables }, {}, '/:harborId/blueprints'>();

blueprintRoute.use('*', harborGuard);

blueprintRoute.get('/', (c) => {
	const { harborId } = c.req.param();
	const type = c.req.query('type');
	return c.json(getBlueprintsByHarbor(harborId, type));
});

blueprintRoute.get('/:blueprintId', (c) => {
	const { harborId, blueprintId } = c.req.param();
	return c.json(getBlueprintById(harborId, blueprintId));
});

blueprintRoute.post('/', async (c) => {
	const { harborId } = c.req.param();
	const userId = c.get('user').id;
	const body = await c.req.json();
	const result = createBlueprintSchema.safeParse(body);

	if (!result.success) {
		return c.json({ error: 'Validation failed', details: result.error.flatten() }, 400);
	}

	return c.json(createBlueprint(harborId, result.data, userId), 201);
});

blueprintRoute.put('/:blueprintId', async (c) => {
	const { harborId, blueprintId } = c.req.param();
	const userId = c.get('user').id;
	const body = await c.req.json();
	const result = updateBlueprintSchema.safeParse(body);

	if (!result.success) {
		return c.json({ error: 'Validation failed', details: result.error.flatten() }, 400);
	}

	return c.json(updateBlueprint(harborId, blueprintId, result.data, userId));
});

blueprintRoute.delete('/:blueprintId', (c) => {
	const { harborId, blueprintId } = c.req.param();
	const userId = c.get('user').id;
	deleteBlueprint(harborId, blueprintId, userId);
	return c.body(null, 204);
});
