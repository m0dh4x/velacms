import { db } from '@vela/db';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

export const harborGuard = createMiddleware(async (c, next) => {
	const userId = c.get('user').id;
	const harborId = c.req.param('harborId') ?? c.req.param('id');

	if (!harborId) {
		throw new HTTPException(400, { message: 'Harbor ID is required' });
	}

	const member = db
		.prepare<{ role_id: string; is_owner: number; permissions: string }, [string, string]>(`
      SELECT role_id, is_owner, permissions
      FROM harbor_members
      WHERE user_id = ? AND harbor_id = ? `)
		.get(userId, harborId);

	if (!member) {
		throw new HTTPException(403, { message: 'User is not a member of the harbor' });
	}

	c.set('harborMember', {
		roleId: member.role_id,
		isOwner: !!member.is_owner,
		permissions: JSON.parse(member.permissions),
	});
	await next();
});
