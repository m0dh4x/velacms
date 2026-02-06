import { db, appendEvent, getNextVersion } from '@vela/db';
import { nanoid } from 'nanoid';
import { HTTPException } from 'hono/http-exception';
import { setupHarborDefaults } from './harbor.defaults';

type HarborRow = {
	id: string;
	name: string;
	slug: string;
	settings: string;
	organization_id: string | null;
	created_at: string;
	updated_at: string;
};
type StoredHarbor = {
	id: string;
	name: string;
	slug: string;
	settings: string;
	organizationId: string | null;
	createdAt: string;
	updatedAt: string;
};

// helper function to map event row data to stored event data (snake_case to camelCase)
const mapRowToHarbor = (row: HarborRow): StoredHarbor => ({
	id: row.id,
	name: row.name,
	slug: row.slug,
	settings: row.settings,
	organizationId: row.organization_id,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

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

		setupHarborDefaults(harborId, userId);
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
	return mapRowToHarbor(harbor);
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

	return harbors.map(mapRowToHarbor);
};

export const updateHarbor = (
	id: string,
	input: { name?: string; settings?: Record<string, unknown> },
	userId: string,
) => {
	const current = getHarborById(id);
	const nextVersion = getNextVersion(db, 'Harbor', id);

	db.transaction(() => {
		db.prepare(
			`UPDATE harbors SET name = ?, settings = ?, updated_at = datetime('now') WHERE id = ?`,
		).run(input.name ?? current.name, JSON.stringify(input.settings ?? current.settings), id);

		appendEvent(db, {
			id: `evt_${nanoid(16)}`,
			harborId: id,
			aggregateType: 'Harbor',
			aggregateId: id,
			eventType: 'HarborUpdated',
			version: nextVersion,
			payload: {
				...(input.name !== undefined && { name: input.name }),
				...(input.settings !== undefined && { settings: input.settings }),
				updatedBy: userId,
			},
			metadata: { userId },
		});
	})();

	return getHarborById(id);
};

export const deleteHarbor = (id: string, userId: string) => {
	getHarborById(id); // throws 404 if not found

	const nextVersion = getNextVersion(db, 'Harbor', id);

	db.transaction(() => {
		appendEvent(db, {
			id: `evt_${nanoid(16)}`,
			harborId: id,
			aggregateType: 'Harbor',
			aggregateId: id,
			eventType: 'HarborDeleted',
			version: nextVersion,
			payload: { deletedBy: userId },
			metadata: { userId },
		});

		db.prepare('DELETE FROM harbors WHERE id = ?').run(id);
	})();
};
