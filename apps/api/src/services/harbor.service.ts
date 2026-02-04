import { db, appendEvent } from '@vela/db';
import { nanoid } from 'nanoid';
import { HTTPException } from 'hono/http-exception';

type HarborRow = {
	id: string;
	name: string;
	slug: string;
	settings: string;
	organization_id: string | null;
	created_at: string;
	updated_at: string;
};

export const createHarbor = (
	slug: string,
	name: string,
	userId: string,
	organizationId: string | null,
) => {
	const slugExists = db.prepare('SELECT * FROM harbors WHERE slug = ?').get(slug);

	if (slugExists) {
		throw new HTTPException(409, { message: 'Harbor with this slug already exists' });
	}

	const harborId = `har_${nanoid(16)}`;

	db.transaction(() => {
		db.prepare(
			`INSERT INTO harbors (id, name, slug, settings, organization_id) VALUES (?, ?, ?, '{}', ?)`,
		).run(harborId, name, slug, organizationId ?? null);

		appendEvent(db, {
			id: `evt_${nanoid(16)}`,
			harborId: harborId,
			aggregateType: 'Harbor',
			aggregateId: harborId,
			eventType: 'HarborCreated',
			version: 1,
			payload: { id: harborId, name, slug, settings: {}, createdBy: userId, organizationId },
			metadata: { userId },
		});
	})();

	return getHarborById(harborId);
};

export const getHarborById = (id: string) => {
	const harbor = db
		.prepare<HarborRow, [string]>(
			`SELECT id, name, slug, settings, organization_id, created_at, updated_at FROM harbors WHERE id = ?`,
		)
		.get(id);

	if (!harbor) {
		throw new HTTPException(404, { message: 'Harbor not found' });
	}
	return {
		id: harbor.id,
		name: harbor.name,
		slug: harbor.slug,
		settings: JSON.parse(harbor.settings),
		organizationId: harbor.organization_id,
		createdAt: new Date(harbor.created_at),
		updatedAt: new Date(harbor.updated_at),
	};
};

export const getHarborsByUser = (userId: string) => {
	const harbors = db
		.prepare<HarborRow, [string]>(`
      SELECT id, name, slug, settings, organization_id, created_at, updated_at
			FROM harbors h
			INNER JOIN harbor_members hm
			ON h.id = hm.harbor_id
			WHERE hm.user_id = ?
			ORDER BY h.created_at DESC
		`)
		.all(userId);

	return harbors.map((harbor) => ({
		id: harbor.id,
		name: harbor.name,
		slug: harbor.slug,
		settings: JSON.parse(harbor.settings),
		organizationId: harbor.organization_id,
		createdAt: new Date(harbor.created_at),
		updatedAt: new Date(harbor.updated_at),
	}));
};
