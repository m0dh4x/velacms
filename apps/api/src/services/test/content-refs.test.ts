import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Database } from 'bun:sqlite';
import { appendEvent, getEvents, getNextVersion } from '@vela/db';
import type { StoredContentRef } from '../content-refs';

let testDb = new Database(':memory:');

mock.module('@vela/db', () => ({
	get db() {
		return testDb;
	},
	appendEvent,
	getEvents,
	getNextVersion,
}));

const { createContent, deleteContent, updateContent } = await import('../content');
const { createBlueprint } = await import('../blueprint');
const { getRefsByContent, getRefsByTarget } = await import('../content-refs');

const TEST_HARBOR_ID = 'har_testharbor0001';
const TEST_USER_ID = 'usr_testuser000001';

const setupSchema = (db: Database): void => {
	db.run('PRAGMA foreign_keys = ON');

	db.run(`
		CREATE TABLE events (
			sequence INTEGER PRIMARY KEY AUTOINCREMENT,
			id TEXT NOT NULL UNIQUE,
			harbor_id TEXT,
			aggregate_type TEXT NOT NULL,
			aggregate_id TEXT NOT NULL,
			event_type TEXT NOT NULL,
			version INTEGER NOT NULL,
			payload TEXT NOT NULL,
			metadata TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE (aggregate_type, aggregate_id, version)
		)
	`);

	db.run(`
		CREATE TABLE harbors (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			slug TEXT NOT NULL UNIQUE,
			settings TEXT NOT NULL DEFAULT '{}',
			organization_id TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run(`
		CREATE TABLE blueprints (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL,
			name TEXT NOT NULL,
			slug TEXT NOT NULL,
			description TEXT,
			icon TEXT,
			type TEXT NOT NULL,
			schema TEXT NOT NULL DEFAULT '{}',
			settings TEXT NOT NULL DEFAULT '{}',
			version INTEGER NOT NULL DEFAULT 1,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(harbor_id, slug)
		)
	`);

	db.run(`
		CREATE TABLE content (
			id TEXT NOT NULL PRIMARY KEY,
			harbor_id TEXT NOT NULL,
			blueprint_id TEXT NOT NULL,
			canonical_id TEXT NOT NULL,
			locale TEXT NOT NULL,
			slug TEXT NOT NULL,
			title TEXT NOT NULL,
			data TEXT NOT NULL,
			workflow_state TEXT,
			is_published INTEGER NOT NULL DEFAULT 0,
			version INTEGER NOT NULL,
			published_at DATETIME,
			created_by TEXT NOT NULL,
			updated_by TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT (datetime('now')),
			updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run(`
		CREATE TABLE content_refs (
			id TEXT NOT NULL PRIMARY KEY,
			source_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
			target_canonical_id TEXT NOT NULL,
			field_path TEXT NOT NULL,
			position INTEGER NOT NULL,
			created_at DATETIME NOT NULL DEFAULT (datetime('now'))
		)
	`);
};

const seedTestData = (db: Database): void => {
	db.prepare('INSERT INTO harbors (id, name, slug) VALUES (?, ?, ?)').run(
		TEST_HARBOR_ID,
		'Test Harbor',
		'test-harbor',
	);
};

setupSchema(testDb);

beforeEach(() => {
	testDb.run('DELETE FROM content_refs');
	testDb.run('DELETE FROM content');
	testDb.run('DELETE FROM events');
	testDb.run('DELETE FROM blueprints');
	testDb.run('DELETE FROM harbors');
	seedTestData(testDb);
});

const createAuthorBlueprint = () =>
	createBlueprint(
		TEST_HARBOR_ID,
		{
			name: 'Author',
			slug: 'author',
			type: 'entity' as const,
			schema: {
				fields: [{ name: 'name', type: 'text' as const, required: false, localized: false }],
			},
		},
		TEST_USER_ID,
	);

const createPostBlueprint = (authorBlueprintId: string) =>
	createBlueprint(
		TEST_HARBOR_ID,
		{
			name: 'Post',
			slug: 'post',
			type: 'entity' as const,
			schema: {
				fields: [
					{ name: 'body', type: 'text' as const, required: false, localized: false },
					{
						name: 'author',
						type: 'reference' as const,
						required: false,
						localized: false,
						options: { blueprints: [authorBlueprintId], multiple: false },
					},
					{
						name: 'tags',
						type: 'reference' as const,
						required: false,
						localized: false,
						options: { blueprints: [authorBlueprintId], multiple: true },
					},
				],
			},
		},
		TEST_USER_ID,
	);

describe('Content Refs Service', () => {
	describe('syncContentRefs on create', () => {
		test('creates refs when content has a single reference field', () => {
			const authorBp = createAuthorBlueprint();
			const postBp = createPostBlueprint(authorBp.id);

			const author = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: authorBp.id,
					slug: 'max',
					title: 'Max',
					data: { name: 'Max Mustermann' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const post = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: postBp.id,
					slug: 'first-post',
					title: 'My First Post',
					data: { body: 'Hello world', author: author.canonicalId },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const refs = getRefsByContent(post.id);
			expect(refs).toHaveLength(1);
			expect(refs[0]!.sourceId).toBe(post.id);
			expect(refs[0]!.targetCanonicalId).toBe(author.canonicalId);
			expect(refs[0]!.fieldPath).toBe('author');
			expect(refs[0]!.position).toBe(0);
		});

		test('creates refs for multiple reference field (array)', () => {
			const authorBp = createAuthorBlueprint();
			const postBp = createPostBlueprint(authorBp.id);

			const tag1 = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: authorBp.id,
					slug: 'tag-tech',
					title: 'Tech',
					data: { name: 'Tech' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const tag2 = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: authorBp.id,
					slug: 'tag-cms',
					title: 'CMS',
					data: { name: 'CMS' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const post = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: postBp.id,
					slug: 'tagged-post',
					title: 'Tagged Post',
					data: { body: 'Hello', tags: [tag1.canonicalId, tag2.canonicalId] },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const refs = getRefsByContent(post.id);
			const tagRefs = refs.filter((r: StoredContentRef) => r.fieldPath === 'tags');
			expect(tagRefs).toHaveLength(2);
			expect(tagRefs[0]!.targetCanonicalId).toBe(tag1.canonicalId);
			expect(tagRefs[0]!.position).toBe(0);
			expect(tagRefs[1]!.targetCanonicalId).toBe(tag2.canonicalId);
			expect(tagRefs[1]!.position).toBe(1);
		});

		test('returns empty array when content has no reference fields', () => {
			const authorBp = createAuthorBlueprint();

			const author = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: authorBp.id,
					slug: 'max',
					title: 'Max',
					data: { name: 'Max' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const refs = getRefsByContent(author.id);
			expect(refs).toEqual([]);
		});
	});

	describe('syncContentRefs on update', () => {
		test('updates refs when content data changes', () => {
			const authorBp = createAuthorBlueprint();
			const postBp = createPostBlueprint(authorBp.id);

			const author1 = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: authorBp.id,
					slug: 'max',
					title: 'Max',
					data: { name: 'Max' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const author2 = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: authorBp.id,
					slug: 'anna',
					title: 'Anna',
					data: { name: 'Anna' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const post = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: postBp.id,
					slug: 'my-post',
					title: 'My Post',
					data: { body: 'Hello', author: author1.canonicalId },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			expect(getRefsByContent(post.id)).toHaveLength(1);
			expect(getRefsByContent(post.id)[0]!.targetCanonicalId).toBe(author1.canonicalId);

			updateContent(
				TEST_HARBOR_ID,
				post.id,
				{ data: { body: 'Updated', author: author2.canonicalId } },
				TEST_USER_ID,
			);

			const refs = getRefsByContent(post.id);
			expect(refs).toHaveLength(1);
			expect(refs[0]!.targetCanonicalId).toBe(author2.canonicalId);
		});

		test('does not change refs when data is not updated', () => {
			const authorBp = createAuthorBlueprint();
			const postBp = createPostBlueprint(authorBp.id);

			const author = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: authorBp.id,
					slug: 'max',
					title: 'Max',
					data: { name: 'Max' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const post = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: postBp.id,
					slug: 'my-post',
					title: 'My Post',
					data: { body: 'Hello', author: author.canonicalId },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			updateContent(TEST_HARBOR_ID, post.id, { title: 'New Title' }, TEST_USER_ID);

			const refs = getRefsByContent(post.id);
			expect(refs).toHaveLength(1);
			expect(refs[0]!.targetCanonicalId).toBe(author.canonicalId);
		});
	});

	describe('cascade delete', () => {
		test('removes refs when source content is deleted', () => {
			const authorBp = createAuthorBlueprint();
			const postBp = createPostBlueprint(authorBp.id);

			const author = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: authorBp.id,
					slug: 'max',
					title: 'Max',
					data: { name: 'Max' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const post = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: postBp.id,
					slug: 'my-post',
					title: 'My Post',
					data: { body: 'Hello', author: author.canonicalId },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			expect(getRefsByContent(post.id)).toHaveLength(1);

			deleteContent(TEST_HARBOR_ID, post.id, TEST_USER_ID);

			const refs = getRefsByContent(post.id);
			expect(refs).toEqual([]);
		});
	});

	describe('getRefsByTarget', () => {
		test('returns content referencing a given canonical ID', () => {
			const authorBp = createAuthorBlueprint();
			const postBp = createPostBlueprint(authorBp.id);

			const author = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: authorBp.id,
					slug: 'max',
					title: 'Max',
					data: { name: 'Max' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const post1 = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: postBp.id,
					slug: 'post-1',
					title: 'Post 1',
					data: { body: 'Hello', author: author.canonicalId },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const post2 = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: postBp.id,
					slug: 'post-2',
					title: 'Post 2',
					data: { body: 'World', author: author.canonicalId },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			const refs = getRefsByTarget(author.canonicalId);
			expect(refs).toHaveLength(2);
			expect(refs.map((r: StoredContentRef) => r.sourceId).sort()).toEqual(
				[post1.id, post2.id].sort(),
			);
		});

		test('returns empty array when nothing references the canonical ID', () => {
			const refs = getRefsByTarget('can_doesnotexist00');
			expect(refs).toEqual([]);
		});
	});
});
