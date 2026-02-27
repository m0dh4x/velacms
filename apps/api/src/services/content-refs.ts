import { db } from '@vela/db';
import { getBlueprintById } from './blueprint';
import { nanoid } from 'nanoid';

type ContentRefRow = {
	id: string;
	source_id: string;
	target_canonical_id: string;
	field_path: string;
	position: number;
	created_at: string;
};

export type StoredContentRef = {
	id: string;
	sourceId: string;
	targetCanonicalId: string;
	fieldPath: string;
	position: number;
	createdAt: string;
};

type ReferenceField = {
	name: string;
	type: 'reference';
	options: {
		blueprints: string[];
		multiple: boolean;
	};
};

const mapRowToContentRef = (row: ContentRefRow): StoredContentRef => ({
	id: row.id,
	sourceId: row.source_id,
	targetCanonicalId: row.target_canonical_id,
	fieldPath: row.field_path,
	position: row.position,
	createdAt: row.created_at,
});

const getReferenceFields = (harborId: string, blueprintId: string): ReferenceField[] => {
	const blueprint = getBlueprintById(harborId, blueprintId);
	const schema = blueprint.schema as {
		fields: { name: string; type: string; options?: unknown }[];
	};

	return schema.fields.filter((f) => f.type === 'reference') as ReferenceField[];
};

const toTargets = (value: unknown, multiple: boolean): string[] => {
	if (value === undefined || value === null) return [];

	return multiple ? (value as string[]) : [value as string];
};

export const syncContentRefs = (
	contentId: string,
	blueprintId: string,
	harborId: string,
	data: Record<string, unknown>,
): void => {
	const refFields = getReferenceFields(harborId, blueprintId);
	if (refFields.length === 0) return;

	db.transaction(() => {
		db.prepare('DELETE FROM content_refs WHERE source_id = ?').run(contentId);

		const insert = db.prepare(
			'INSERT INTO content_refs (id, source_id, target_canonical_id, field_path, position) VALUES (?, ?, ?, ?, ?)',
		);

		for (const field of refFields) {
			const targets = toTargets(data[field.name], field.options.multiple);

			targets.forEach((target, i) => {
				insert.run(`ref_${nanoid(16)}`, contentId, target, field.name, i);
			});
		}
	})();
};

export const getRefsByContent = (contentId: string): StoredContentRef[] => {
	return db
		.prepare<ContentRefRow, [string]>('SELECT * FROM content_refs WHERE source_id = ?')
		.all(contentId)
		.map(mapRowToContentRef);
};

export const getRefsByTarget = (canonicalId: string): StoredContentRef[] => {
	return db
		.prepare<ContentRefRow, [string]>('SELECT * FROM content_refs WHERE target_canonical_id = ?')
		.all(canonicalId)
		.map(mapRowToContentRef);
};
