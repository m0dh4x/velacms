import { appendEvent, db, getNextVersion } from '@vela/db';
import type { CreateBlueprintInput, UpdateBlueprintInput } from '../schemas/blueprint';
import { HTTPException } from 'hono/http-exception';
import { nanoid } from 'nanoid';

type BlueprintRow = {
	id: string;
	harbor_id: string;
	name: string;
	slug: string;
	description: string | null;
	icon: string | null;
	type: string;
	schema: string;
	settings: string;
	version: number;
	created_at: string;
	updated_at: string;
};

type StoredBlueprint = {
	id: string;
	harborId: string;
	name: string;
	slug: string;
	description: string | null;
	icon: string | null;
	type: string;
	schema: Record<string, unknown>;
	settings: Record<string, unknown>;
	version: number;
	createdAt: string;
	updatedAt: string;
};

const mapRowToBlueprint = (row: BlueprintRow): StoredBlueprint => {
	return {
		id: row.id,
		harborId: row.harbor_id,
		name: row.name,
		slug: row.slug,
		description: row.description,
		type: row.type,
		icon: row.icon,
		schema: JSON.parse(row.schema),
		settings: JSON.parse(row.settings),
		version: row.version,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
};

export const createBlueprint = (
	harborId: string,
	input: CreateBlueprintInput,
	userId: string,
): StoredBlueprint => {
	const blueprintId = `bpr_${nanoid(16)}`;

	const slugExist = db
		.prepare('SELECT id FROM blueprints WHERE harbor_id = ? AND slug = ?')
		.get(harborId, input.slug);

	if (slugExist) {
		throw new HTTPException(409, { message: 'Blueprint already exists' });
	}

	db.transaction(() => {
		appendEvent(db, {
			id: `evt_${nanoid(16)}`,
			harborId,
			aggregateType: 'Blueprint',
			aggregateId: blueprintId,
			eventType: 'BlueprintCreated',
			version: 1,
			payload: { id: blueprintId, harborId, name: input.name, slug: input.slug },
			metadata: {
				userId,
			},
		});

		db.prepare(`
        INSERT INTO blueprints (id, harbor_id, name, slug, description, icon, type, schema, settings, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(
			blueprintId,
			harborId,
			input.name,
			input.slug,
			input.description ?? null,
			input.icon ?? null,
			input.type,
			JSON.stringify(input.schema),
			JSON.stringify(input.settings),
			1,
		);
	})();

	return getBlueprintById(harborId, blueprintId);
};

export const getBlueprintById = (harborId: string, blueprintId: string): StoredBlueprint => {
	const blueprint = db
		.prepare<BlueprintRow, [string, string]>(
			'SELECT * FROM blueprints WHERE harbor_id = ? AND id = ?',
		)
		.get(harborId, blueprintId);

	if (!blueprint) {
		throw new HTTPException(404, { message: 'Blueprint not found' });
	}

	return mapRowToBlueprint(blueprint);
};

export const getBlueprintsByHarbor = (harborId: string, type?: string): StoredBlueprint[] => {
	if (type) {
		return db
			.prepare<BlueprintRow, [string, string]>(
				'SELECT * FROM blueprints WHERE harbor_id = ? AND type = ? ORDER BY name ASC',
			)
			.all(harborId, type)
			.map(mapRowToBlueprint);
	}

	return db
		.prepare<BlueprintRow, [string]>(
			'SELECT * FROM blueprints WHERE harbor_id = ? ORDER BY name ASC',
		)
		.all(harborId)
		.map(mapRowToBlueprint);
};

export const updateBlueprint = (
	harborId: string,
	blueprintId: string,
	input: UpdateBlueprintInput,
	userId: string,
): StoredBlueprint => {
	const blueprint = getBlueprintById(harborId, blueprintId);
	const nextVersion = getNextVersion(db, 'Blueprint', blueprintId);
	const newSchemaVersion = input.schema ? blueprint.version + 1 : blueprint.version;

	db.transaction(() => {
		appendEvent(db, {
			id: `evt_${nanoid(16)}`,
			harborId,
			aggregateType: 'Blueprint',
			eventType: 'BlueprintUpdated',
			aggregateId: blueprintId,
			version: nextVersion,
			payload: {
				...(input.name !== undefined && { name: input.name }),
				...(input.description !== undefined && { description: input.description }),
				...(input.icon !== undefined && { icon: input.icon }),
				...(input.schema !== undefined && { schema: input.schema }),
				...(input.settings !== undefined && { settings: input.settings }),
				updatedBy: userId,
			},
			metadata: { userId },
		});

		db.prepare(
			`UPDATE blueprints
			 SET name = ?, description = ?, icon = ?, schema = ?, settings = ?, version = ?, updated_at = datetime('now')
			 WHERE harbor_id = ? AND id = ?`,
		).run(
			input.name ?? blueprint.name,
			input.description ?? blueprint.description,
			input.icon ?? blueprint.icon,
			JSON.stringify(input.schema ?? blueprint.schema),
			JSON.stringify(input.settings ?? blueprint.settings),
			newSchemaVersion,
			harborId,
			blueprintId,
		);
	})();

	return getBlueprintById(harborId, blueprintId);
};

export const deleteBlueprint = (harborId: string, blueprintId: string, userId: string): void => {
	getBlueprintById(harborId, blueprintId);

	const contentCount = db
		.prepare<{ count: number }, [string]>(
			'SELECT COUNT(*) as count FROM content WHERE blueprint_id = ?',
		)
		.get(blueprintId);

	if (contentCount && contentCount.count > 0) {
		throw new HTTPException(409, {
			message: `Cannot delete blueprint: ${contentCount.count} content items are using it`,
		});
	}

	const nextVersion = getNextVersion(db, 'Blueprint', blueprintId);

	db.transaction(() => {
		appendEvent(db, {
			id: `evt_${nanoid(16)}`,
			harborId,
			aggregateType: 'Blueprint',
			aggregateId: blueprintId,
			eventType: 'BlueprintDeleted',
			version: nextVersion,
			payload: { deletedBy: userId },
			metadata: { userId },
		});

		db.prepare('DELETE FROM blueprints WHERE id = ?').run(blueprintId);
	})();
};
