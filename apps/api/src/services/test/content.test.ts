import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Database } from 'bun:sqlite';
import { appendEvent, getEvents, getNextVersion } from '@vela/db';

let testDb = new Database(':memory:');

// Mock @vela/db so the service uses our in-memory DB
mock.module('@vela/db', () => ({
	get db() {
		return testDb;
	},
	appendEvent,
	getEvents,
	getNextVersion,
}));

// Import service AFTER mock is registered
const { createContent, getContentById, getContentByHarbor } = await import('../content');

// Test fixtures
const TEST_HARBOR_ID = 'har_testharbor0001';
const TEST_BLUEPRINT_ID = 'bpr_testblueprint1';
const TEST_USER_ID = 'usr_testuser000001';

const setupSchema = (db: Database): void => {
	db.run('PRAGMA foreign_keys = OFF');

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
			source_id TEXT NOT NULL,
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

	db.prepare(
		'INSERT INTO blueprints (id, harbor_id, name, slug, type, schema, settings) VALUES (?, ?, ?, ?, ?, ?, ?)',
	).run(TEST_BLUEPRINT_ID, TEST_HARBOR_ID, 'Article', 'article', 'entity', '{"fields":[]}', '{}');
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

describe('Content Service', () => {
	describe('createContent and getContentById', () => {
		test('returns stored content with correct fields', () => {
			const content = createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: TEST_BLUEPRINT_ID,
					slug: 'hello-world',
					title: 'Hello World',
					data: { body: 'Some content here' },
					locale: 'en',
				},
				TEST_USER_ID,
			);

			expect(content.id).toStartWith('cnt_');
			expect(content.canonicalId).toStartWith('can_');
			expect(content.harborId).toBe(TEST_HARBOR_ID);
			expect(content.blueprintId).toBe(TEST_BLUEPRINT_ID);
			expect(content.slug).toBe('hello-world');
			expect(content.title).toBe('Hello World');
			expect(content.data).toEqual({ body: 'Some content here' });
			expect(content.locale).toBe('en');
			expect(content.workflowState).toBeNull();
			expect(content.isPublished).toBe(false);
			expect(content.version).toBe(1);
			expect(content.publishedAt).toBeNull();
			expect(content.createdBy).toBe(TEST_USER_ID);
			expect(content.updatedBy).toBe(TEST_USER_ID);
		});

		test('throws 404 for non-existent content', () => {
			expect(() => getContentById(TEST_HARBOR_ID, 'cnt_doesnotexist00')).toThrow();
		});
	});

	describe('getContentByHarbor', () => {
		test('returns content by harbor', () => {
			createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: TEST_BLUEPRINT_ID,
					slug: 'hello-world',
					title: 'Hello World',
					data: { body: 'Some content here' },
					locale: 'en',
				},
				TEST_USER_ID,
			);
			createContent(
				TEST_HARBOR_ID,
				{
					blueprintId: TEST_BLUEPRINT_ID,
					slug: 'hello-world2',
					title: 'Hello World2',
					data: { body: 'Some content here' },
					locale: 'en',
				},
				TEST_USER_ID,
			);
			const contentFound = getContentByHarbor(TEST_HARBOR_ID);
			expect(contentFound.length).toBe(2);
		});
	});

	describe('updateContent', () => {
		// ...
	});

	describe('deleteContent', () => {
		// ...
	});
});
