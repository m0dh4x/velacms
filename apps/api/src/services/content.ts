import { appendEvent, db, getNextVersion } from '@vela/db';
import type { CreateContentInput } from '../schemas/content';
import { nanoid } from 'nanoid';
import { HTTPException } from 'hono/http-exception';

type ContentRow = {
	id: string;
	harbor_id: string;
	blueprint_id: string;
	canonical_id: string;
	locale: string;
	slug: string;
	title: string;
	data: string;
	is_published: boolean;
	workflow_state: string | null;
	published_at: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: string;
	updated_at: string;
};

type StoredContent = {
	id: string;
	harborId: string;
	blueprintId: string;
	canonicalId: string;
	locale: string;
	slug: string;
	title: string;
	data: Record<string, unknown>;
	workflowState: string | null;
	version: number;
	isPublished: boolean;
	publishedAt: string | null;
	createdBy: string;
	updatedBy: string;
	createdAt: string;
	updatedAt: string;
};

const mapRowToContent = (row: ContentRow): StoredContent => {
	return {
		id: row.id,
		harborId: row.harbor_id,
		blueprintId: row.blueprint_id,
		canonicalId: row.canonical_id,
		locale: row.locale,
		slug: row.slug,
		title: row.title,
		data: JSON.parse(row.data),
		workflowState: row.workflow_state || null,
		version: row.version,
		isPublished: !!row.is_published,
		publishedAt: row.published_at || null,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
};

export const createContent = (
	harborId: string,
	input: CreateContentInput,
	userId: string,
): StoredContent => {
	const contentId = `cnt_${nanoid(16)}`;
	const canonicalId = `can_${nanoid(16)}`;
	const slugExist = db
		.prepare<ContentRow, [string, string]>(
			'SELECT id FROM content WHERE harbor_id = ? AND slug = ?',
		)
		.get(harborId, input.slug);

	if (slugExist) {
		throw new HTTPException(409, { message: 'Content already exists' });
	}

	db.transaction(() => {
		appendEvent(db, {
			id: `evt_${nanoid(16)}`,
			harborId,
			aggregateType: 'Content',
			aggregateId: contentId,
			eventType: 'ContentCreated',
			version: 1,
			payload: { id: contentId, harborId, slug: input.slug },
			metadata: {
				userId,
			},
		});

		db.prepare(`INSERT INTO content
		(
			id,
			harbor_id,
			blueprint_id,
			canonical_id,
			locale,
			slug,
			title,
			data,
			is_published,
			workflow_state,
			version,
			published_at,
			created_by,
			updated_by,
			created_at,
			updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
			contentId,
			harborId,
			input.blueprintId,
			canonicalId,
			input.locale,
			input.slug,
			input.title,
			JSON.stringify(input.data),
			false,
			null,
			1,
			null,
			userId,
			userId,
			new Date().toISOString(),
			new Date().toISOString(),
		);
	})();

	return getContentById(harborId, contentId);
};

export const deleteContent = (harborId: string, contentId: string, userId: string) => {
	getContentById(harborId, contentId);

	db.transaction(() => {
		const nextVersion = getNextVersion(db, 'Content', contentId);
		appendEvent(db, {
			id: `evt_${nanoid(16)}`,
			harborId,
			aggregateType: 'Content',
			aggregateId: contentId,
			eventType: 'ContentDeleted',
			version: nextVersion,
			payload: { deletedBy: userId },
			metadata: { userId },
		});

		db.prepare('DELETE FROM content WHERE harbor_id = ? AND id = ?').run(harborId, contentId);
	})();
};

export const getContentById = (harborId: string, contentId: string): StoredContent => {
	const content = db
		.prepare<ContentRow, [string, string]>('SELECT * FROM content WHERE harbor_id = ? and id = ? ')
		.get(harborId, contentId);

	if (!content) {
		throw new HTTPException(404, { message: 'Content not found' });
	}

	return mapRowToContent(content);
};

export const getContentByHarbor = (harborId: string) => {
	const content = db
		.prepare<ContentRow, [string]>('SELECT * FROM content WHERE harbor_id = ?')
		.all(harborId);

	if (!content) {
		throw new HTTPException(404, { message: 'Content not found for harbor' });
	}

	return content.map(mapRowToContent);
};
