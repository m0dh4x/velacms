import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Database } from 'bun:sqlite';
import { appendEvent, getEvents, getNextVersion } from '@vela/db';

let testDb = new Database(':memory:');

mock.module('@vela/db', () => ({
	get db() {
		return testDb;
	},
	appendEvent,
	getEvents,
	getNextVersion,
}));

const {
	createBlueprint,
	getBlueprintById,
	getBlueprintsByHarbor,
	updateBlueprint,
	deleteBlueprint,
} = await import('../blueprint');

const TEST_HARBOR_ID = 'har_testharbor0001';
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
	testDb.run('DELETE FROM content');
	testDb.run('DELETE FROM blueprints');
	testDb.run('DELETE FROM events');
	testDb.run('DELETE FROM harbors');
	seedTestData(testDb);
});

describe('Blueprint Service', () => {
	describe('createBlueprint and getBlueprintById', () => {
		test('returns stored blueprint with correct fields', () => {
			const blueprint = createBlueprint(
				TEST_HARBOR_ID,
				{
					name: 'Article',
					slug: 'article',
					type: 'entity',
					schema: { fields: [] },
					settings: {},
				},
				TEST_USER_ID,
			);

			expect(blueprint.id).toStartWith('bpr_');
			expect(blueprint.harborId).toBe(TEST_HARBOR_ID);
			expect(blueprint.name).toBe('Article');
			expect(blueprint.slug).toBe('article');
			expect(blueprint.type).toBe('entity');
			expect(blueprint.schema).toEqual({ fields: [] });
			expect(blueprint.settings).toEqual({});
			expect(blueprint.version).toBe(1);
			expect(blueprint.description).toBeNull();
			expect(blueprint.icon).toBeNull();
		});

		test('throws 409 for duplicate slug in same harbor', () => {
			createBlueprint(
				TEST_HARBOR_ID,
				{ name: 'Article', slug: 'article', type: 'entity', schema: { fields: [] }, settings: {} },
				TEST_USER_ID,
			);

			expect(() =>
				createBlueprint(
					TEST_HARBOR_ID,
					{
						name: 'Article 2',
						slug: 'article',
						type: 'entity',
						schema: { fields: [] },
						settings: {},
					},
					TEST_USER_ID,
				),
			).toThrow('Blueprint already exists');
		});

		test('throws 404 for non-existent blueprint', () => {
			expect(() => getBlueprintById(TEST_HARBOR_ID, 'bpr_doesnotexist0')).toThrow(
				'Blueprint not found',
			);
		});
	});

	describe('getBlueprintsByHarbor', () => {
		test('returns all blueprints for a harbor', () => {
			createBlueprint(
				TEST_HARBOR_ID,
				{ name: 'Article', slug: 'article', type: 'entity', schema: { fields: [] }, settings: {} },
				TEST_USER_ID,
			);
			createBlueprint(
				TEST_HARBOR_ID,
				{ name: 'Page', slug: 'page', type: 'entity', schema: { fields: [] }, settings: {} },
				TEST_USER_ID,
			);

			const blueprints = getBlueprintsByHarbor(TEST_HARBOR_ID);
			expect(blueprints.length).toBe(2);
		});

		test('filters by type', () => {
			createBlueprint(
				TEST_HARBOR_ID,
				{ name: 'Article', slug: 'article', type: 'entity', schema: { fields: [] }, settings: {} },
				TEST_USER_ID,
			);
			createBlueprint(
				TEST_HARBOR_ID,
				{
					name: 'Sidebar',
					slug: 'sidebar',
					type: 'fragment',
					schema: { fields: [] },
					settings: {},
				},
				TEST_USER_ID,
			);

			const entities = getBlueprintsByHarbor(TEST_HARBOR_ID, 'entity');
			expect(entities.length).toBe(1);
			expect(entities[0]?.slug).toBe('article');
		});

		test('returns empty array for harbor with no blueprints', () => {
			const blueprints = getBlueprintsByHarbor(TEST_HARBOR_ID);
			expect(blueprints.length).toBe(0);
		});
	});

	describe('updateBlueprint', () => {
		test('updates name, description, and schema version', () => {
			const created = createBlueprint(
				TEST_HARBOR_ID,
				{ name: 'Article', slug: 'article', type: 'entity', schema: { fields: [] }, settings: {} },
				TEST_USER_ID,
			);

			const updated = updateBlueprint(
				TEST_HARBOR_ID,
				created.id,
				{
					name: 'Blog Post',
					schema: {
						fields: [{ name: 'body', type: 'richtext', required: false, localized: false }],
					},
				},
				TEST_USER_ID,
			);

			expect(updated.name).toBe('Blog Post');
			expect(updated.slug).toBe('article');
			expect(updated.schema).toEqual({
				fields: [{ name: 'body', type: 'richtext', required: false, localized: false }],
			});
			expect(updated.version).toBe(2);
		});

		test('does not increment version when schema is not changed', () => {
			const created = createBlueprint(
				TEST_HARBOR_ID,
				{ name: 'Article', slug: 'article', type: 'entity', schema: { fields: [] }, settings: {} },
				TEST_USER_ID,
			);

			const updated = updateBlueprint(
				TEST_HARBOR_ID,
				created.id,
				{ name: 'Renamed Article' },
				TEST_USER_ID,
			);

			expect(updated.version).toBe(1);
		});

		test('throws 404 for non-existent blueprint', () => {
			expect(() =>
				updateBlueprint(TEST_HARBOR_ID, 'bpr_doesnotexist0', { name: 'x' }, TEST_USER_ID),
			).toThrow('Blueprint not found');
		});
	});

	describe('deleteBlueprint', () => {
		test('deletes blueprint by id', () => {
			const blueprint = createBlueprint(
				TEST_HARBOR_ID,
				{ name: 'Article', slug: 'article', type: 'entity', schema: { fields: [] }, settings: {} },
				TEST_USER_ID,
			);

			deleteBlueprint(TEST_HARBOR_ID, blueprint.id, TEST_USER_ID);

			expect(() => getBlueprintById(TEST_HARBOR_ID, blueprint.id)).toThrow('Blueprint not found');
		});

		test('throws 409 when content items reference the blueprint', () => {
			const blueprint = createBlueprint(
				TEST_HARBOR_ID,
				{ name: 'Article', slug: 'article', type: 'entity', schema: { fields: [] }, settings: {} },
				TEST_USER_ID,
			);

			testDb
				.prepare(
					`INSERT INTO content (id, harbor_id, blueprint_id, canonical_id, locale, slug, title, data, version, created_by, updated_by)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.run(
					'cnt_test001',
					TEST_HARBOR_ID,
					blueprint.id,
					'can_test001',
					'en',
					'test-post',
					'Test Post',
					'{}',
					1,
					TEST_USER_ID,
					TEST_USER_ID,
				);

			expect(() => deleteBlueprint(TEST_HARBOR_ID, blueprint.id, TEST_USER_ID)).toThrow(
				'Cannot delete blueprint',
			);
		});

		test('throws 404 for non-existent blueprint', () => {
			expect(() => deleteBlueprint(TEST_HARBOR_ID, 'bpr_doesnotexist0', TEST_USER_ID)).toThrow(
				'Blueprint not found',
			);
		});
	});
});
