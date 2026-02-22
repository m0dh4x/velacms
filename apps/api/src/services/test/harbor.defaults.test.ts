import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Database } from 'bun:sqlite';

let testDb = new Database(':memory:');

mock.module('@vela/db', () => ({
	get db() {
		return testDb;
	},
}));

const { setupHarborDefaults } = await import('../harbor.defaults');

const TEST_HARBOR_ID = 'har_testharbor0001';
const TEST_USER_ID = 'usr_testuser000001';

type RoleRow = { id: string; slug: string; name: string; permissions: string; is_system: number };
type MemberRow = { id: string; user_id: string; role_id: string; is_owner: number };
type LocaleRow = { id: string; code: string; name: string; is_default: number };
type WorkflowRow = {
	id: string;
	name: string;
	states: string;
	transitions: string;
	initial_state: string;
	is_default: number;
};

const setupSchema = (db: Database): void => {
	db.run('PRAGMA foreign_keys = OFF');

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
});

describe('setupHarborDefaults', () => {
	describe('roles', () => {
		test('creates admin, editor, and viewer roles', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const roles = testDb
				.prepare<RoleRow, [string]>('SELECT * FROM harbor_roles WHERE harbor_id = ?')
				.all(TEST_HARBOR_ID);

			expect(roles.length).toBe(3);
			expect(roles.map((r) => r.slug).sort()).toEqual(['admin', 'editor', 'viewer']);
		});

		test('marks the default roles as system roles', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const roles = testDb
				.prepare<RoleRow, [string]>('SELECT * FROM harbor_roles WHERE harbor_id = ?')
				.all(TEST_HARBOR_ID);

			expect(roles.every((r) => r.is_system === 1)).toBe(true);
		});

		test('admin role has full content permissions and all manage flags', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const admin = testDb
				.prepare<RoleRow, [string, string]>(
					'SELECT * FROM harbor_roles WHERE harbor_id = ? AND slug = ?',
				)
				.get(TEST_HARBOR_ID, 'admin');

			const p = JSON.parse(admin!.permissions);
			expect(p.content).toEqual({
				create: true,
				read: true,
				update: true,
				delete: true,
				publish: true,
			});
			expect(p.blueprints.manage).toBe(true);
			expect(p.users.manage).toBe(true);
			expect(p.settings.manage).toBe(true);
		});

		test('editor role can create and update content but not delete, publish, or manage', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const editor = testDb
				.prepare<RoleRow, [string, string]>(
					'SELECT * FROM harbor_roles WHERE harbor_id = ? AND slug = ?',
				)
				.get(TEST_HARBOR_ID, 'editor');

			const p = JSON.parse(editor!.permissions);
			expect(p.content).toEqual({
				create: true,
				read: true,
				update: true,
				delete: false,
				publish: false,
			});
			expect(p.blueprints.manage).toBe(false);
			expect(p.users.manage).toBe(false);
			expect(p.settings.manage).toBe(false);
		});

		test('viewer role has read-only content permissions and no manage flags', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const viewer = testDb
				.prepare<RoleRow, [string, string]>(
					'SELECT * FROM harbor_roles WHERE harbor_id = ? AND slug = ?',
				)
				.get(TEST_HARBOR_ID, 'viewer');

			const p = JSON.parse(viewer!.permissions);
			expect(p.content).toEqual({
				create: false,
				read: true,
				update: false,
				delete: false,
				publish: false,
			});
			expect(p.blueprints.manage).toBe(false);
			expect(p.users.manage).toBe(false);
			expect(p.settings.manage).toBe(false);
		});
	});

	describe('member', () => {
		test('adds the creator as an owner with admin role', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const adminRole = testDb
				.prepare<RoleRow, [string, string]>(
					'SELECT * FROM harbor_roles WHERE harbor_id = ? AND slug = ?',
				)
				.get(TEST_HARBOR_ID, 'admin');

			const member = testDb
				.prepare<MemberRow, [string, string]>(
					'SELECT * FROM harbor_members WHERE harbor_id = ? AND user_id = ?',
				)
				.get(TEST_HARBOR_ID, TEST_USER_ID);

			expect(member).not.toBeNull();
			expect(member!.is_owner).toBe(1);
			expect(member!.role_id).toBe(adminRole!.id);
		});
	});

	describe('locale', () => {
		test('creates English as the default locale', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const locales = testDb
				.prepare<LocaleRow, [string]>('SELECT * FROM harbor_locales WHERE harbor_id = ?')
				.all(TEST_HARBOR_ID);

			expect(locales.length).toBe(1);
			expect(locales[0]?.code).toBe('en');
			expect(locales[0]?.name).toBe('English');
			expect(locales[0]?.is_default).toBe(1);
		});
	});

	describe('workflow', () => {
		test('creates a default draft/published workflow', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const workflows = testDb
				.prepare<WorkflowRow, [string]>('SELECT * FROM workflows WHERE harbor_id = ?')
				.all(TEST_HARBOR_ID);

			expect(workflows.length).toBe(1);
			expect(workflows[0]?.name).toBe('Default');
			expect(workflows[0]?.initial_state).toBe('draft');
			expect(workflows[0]?.is_default).toBe(1);
		});

		test('workflow has draft and published states', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const workflow = testDb
				.prepare<WorkflowRow, [string]>('SELECT * FROM workflows WHERE harbor_id = ?')
				.get(TEST_HARBOR_ID);

			const states = JSON.parse(workflow!.states) as { name: string }[];
			expect(states.map((s) => s.name).sort()).toEqual(['draft', 'published']);
		});

		test('workflow has transitions between draft and published', () => {
			setupHarborDefaults(TEST_HARBOR_ID, TEST_USER_ID);

			const workflow = testDb
				.prepare<WorkflowRow, [string]>('SELECT * FROM workflows WHERE harbor_id = ?')
				.get(TEST_HARBOR_ID);

			const transitions = JSON.parse(workflow!.transitions) as { from: string; to: string }[];
			expect(transitions).toContainEqual({ from: 'draft', to: 'published' });
			expect(transitions).toContainEqual({ from: 'published', to: 'draft' });
		});
	});
});
