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

const { createHarbor, getHarborById, getHarborsByUser, updateHarbor, deleteHarbor } =
	await import('../harbor');

const TEST_USER_ID = 'usr_testuser000001';
const TEST_ORG_ID = null;

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
		CREATE TABLE harbor_roles (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL,
			name TEXT NOT NULL,
			slug TEXT NOT NULL,
			description TEXT,
			permissions TEXT NOT NULL DEFAULT '{}',
			is_system INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run(`
		CREATE TABLE harbor_members (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			harbor_id TEXT NOT NULL,
			role_id TEXT NOT NULL,
			is_owner INTEGER NOT NULL DEFAULT 0,
			permissions TEXT NOT NULL DEFAULT '{}',
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run(`
		CREATE TABLE harbor_locales (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			is_default INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run(`
		CREATE TABLE workflows (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			states TEXT NOT NULL DEFAULT '[]',
			transitions TEXT NOT NULL DEFAULT '[]',
			initial_state TEXT NOT NULL,
			is_default INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);
};

setupSchema(testDb);

beforeEach(() => {
	testDb.run('DELETE FROM workflows');
	testDb.run('DELETE FROM harbor_locales');
	testDb.run('DELETE FROM harbor_members');
	testDb.run('DELETE FROM harbor_roles');
	testDb.run('DELETE FROM events');
	testDb.run('DELETE FROM harbors');
});

describe('Harbor Service', () => {
	describe('createHarbor and getHarborById', () => {
		test('returns stored harbor with correct fields', () => {
			const harbor = createHarbor('my-harbor', 'My Harbor', TEST_USER_ID, TEST_ORG_ID);

			expect(harbor.id).toStartWith('har_');
			expect(harbor.name).toBe('My Harbor');
			expect(harbor.slug).toBe('my-harbor');
			expect(harbor.organizationId).toBeNull();
			expect(harbor.createdAt).toBeDefined();
			expect(harbor.updatedAt).toBeDefined();
		});

		test('seeds default roles, member, locale, and workflow', () => {
			const harbor = createHarbor('my-harbor', 'My Harbor', TEST_USER_ID, TEST_ORG_ID);

			const roles = testDb
				.prepare('SELECT * FROM harbor_roles WHERE harbor_id = ?')
				.all(harbor.id) as { slug: string }[];
			expect(roles.length).toBe(3);
			expect(roles.map((r) => r.slug).sort()).toEqual(['admin', 'editor', 'viewer']);

			const member = testDb
				.prepare('SELECT * FROM harbor_members WHERE harbor_id = ? AND user_id = ?')
				.get(harbor.id, TEST_USER_ID) as { is_owner: number } | null;
			expect(member).not.toBeNull();
			expect(member!.is_owner).toBe(1);

			const locales = testDb
				.prepare('SELECT * FROM harbor_locales WHERE harbor_id = ?')
				.all(harbor.id) as { code: string }[];
			expect(locales.length).toBe(1);
			expect(locales[0]?.code).toBe('en');

			const workflows = testDb
				.prepare('SELECT * FROM workflows WHERE harbor_id = ?')
				.all(harbor.id) as { name: string }[];
			expect(workflows.length).toBe(1);
			expect(workflows[0]?.name).toBe('Default');
		});

		test('throws 409 for duplicate slug', () => {
			createHarbor('my-harbor', 'My Harbor', TEST_USER_ID, TEST_ORG_ID);

			expect(() => createHarbor('my-harbor', 'Other Harbor', TEST_USER_ID, TEST_ORG_ID)).toThrow(
				'Harbor with this slug already exists',
			);
		});

		test('throws 404 for non-existent harbor', () => {
			expect(() => getHarborById('har_doesnotexist00')).toThrow('Harbor not found');
		});
	});

	describe('getHarborsByUser', () => {
		test('returns harbors the user is a member of', () => {
			createHarbor('harbor-one', 'Harbor One', TEST_USER_ID, TEST_ORG_ID);
			createHarbor('harbor-two', 'Harbor Two', TEST_USER_ID, TEST_ORG_ID);

			const harbors = getHarborsByUser(TEST_USER_ID);
			expect(harbors.length).toBe(2);
		});

		test('returns empty array for user with no harbors', () => {
			const harbors = getHarborsByUser('usr_nobody000000000');
			expect(harbors.length).toBe(0);
		});
	});

	describe('updateHarbor', () => {
		test('updates name and increments event version', () => {
			const harbor = createHarbor('my-harbor', 'My Harbor', TEST_USER_ID, TEST_ORG_ID);
			const updated = updateHarbor(harbor.id, { name: 'Renamed Harbor' }, TEST_USER_ID);

			expect(updated.name).toBe('Renamed Harbor');
			expect(updated.slug).toBe('my-harbor');
		});

		test('throws 404 when updating a harbor that does not exist', () => {
			expect(() => updateHarbor('har_doesnotexist00', { name: 'x' }, TEST_USER_ID)).toThrow(
				'Harbor not found',
			);
		});
	});

	describe('deleteHarbor', () => {
		test('deletes harbor by id', () => {
			const harbor = createHarbor('my-harbor', 'My Harbor', TEST_USER_ID, TEST_ORG_ID);
			deleteHarbor(harbor.id, TEST_USER_ID);

			expect(() => getHarborById(harbor.id)).toThrow('Harbor not found');
		});

		test('throws 404 when deleting a harbor that does not exist', () => {
			expect(() => deleteHarbor('har_doesnotexist00', TEST_USER_ID)).toThrow('Harbor not found');
		});
	});
});
