import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createMigrationRunner } from './runner';

describe('createMigrationRunner', () => {
	let db: Database;
	let migrationsPath: string;
	let tempDir: string;

	beforeEach(async () => {
		// Create a temp directory for each test
		tempDir = await mkdtemp(join(tmpdir(), 'vela-migrate-test-'));
		migrationsPath = join(tempDir, 'migrations');
		await mkdir(migrationsPath);

		// Create an in-memory database for testing
		db = new Database(':memory:');
	});

	afterEach(async () => {
		db.close();
		await rm(tempDir, { recursive: true, force: true });
	});

	/**
	 * Helper to create a migration file in the temp directory
	 */
	const createMigration = async (name: string, up: string, down: string) => {
		const content = `
import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	${up}
};

export const down = (db: Database) => {
	${down}
};
`;
		await writeFile(join(migrationsPath, `${name}.ts`), content);
	};

	describe('getMigrationFiles', () => {
		test('returns empty array when no migrations exist', async () => {
			const runner = createMigrationRunner(db, migrationsPath);
			const files = await runner.getMigrationFiles();
			expect(files).toEqual([]);
		});

		test('discovers migration files sorted alphabetically', async () => {
			await createMigration('20240102_second', 'db.run("SELECT 1")', 'db.run("SELECT 1")');
			await createMigration('20240101_first', 'db.run("SELECT 1")', 'db.run("SELECT 1")');
			await createMigration('20240103_third', 'db.run("SELECT 1")', 'db.run("SELECT 1")');

			const runner = createMigrationRunner(db, migrationsPath);
			const files = await runner.getMigrationFiles();

			expect(files).toHaveLength(3);
			expect(files.map((f) => f.name)).toEqual([
				'20240101_first',
				'20240102_second',
				'20240103_third',
			]);
		});

		test('ignores non-.ts files', async () => {
			await createMigration('20240101_valid', 'db.run("SELECT 1")', 'db.run("SELECT 1")');
			await writeFile(join(migrationsPath, 'readme.md'), '# Migrations');
			await writeFile(join(migrationsPath, 'config.json'), '{}');

			const runner = createMigrationRunner(db, migrationsPath);
			const files = await runner.getMigrationFiles();

			expect(files).toHaveLength(1);
			expect(files[0]?.name).toBe('20240101_valid');
		});

		test('throws error if migration missing up or down function', async () => {
			const badMigration = `export const up = () => {};`;
			await writeFile(join(migrationsPath, '20240101_bad.ts'), badMigration);

			const runner = createMigrationRunner(db, migrationsPath);
			expect(runner.getMigrationFiles()).rejects.toThrow("must export 'up' and 'down' functions");
		});

		test('computes checksum for migration files', async () => {
			await createMigration('20240101_test', 'db.run("SELECT 1")', 'db.run("SELECT 1")');

			const runner = createMigrationRunner(db, migrationsPath);
			const files = await runner.getMigrationFiles();

			expect(files).toHaveLength(1);
			expect(files[0]?.checksum).toBeString();
			expect(files[0]?.checksum.length).toBe(64); // SHA-256 hex length
		});
	});

	describe('up', () => {
		test('applies pending migrations', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			const results = await runner.up();

			expect(results).toHaveLength(1);
			expect(results[0]?.status).toBe('applied');
			expect(results[0]?.name).toBe('20240101_create_users');

			// Verify table was created
			const tables = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
				)
				.all();
			expect(tables).toHaveLength(1);
		});

		test('applies multiple migrations in order', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);
			await createMigration(
				'20240102_create_posts',
				'db.run("CREATE TABLE posts (id TEXT PRIMARY KEY, user_id TEXT)")',
				'db.run("DROP TABLE posts")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			const results = await runner.up();

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.name)).toEqual([
				'20240101_create_users',
				'20240102_create_posts',
			]);

			// Both tables should exist
			const tables = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'posts')",
				)
				.all();
			expect(tables).toHaveLength(2);
		});

		test('skips already applied migrations', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);

			const runner = createMigrationRunner(db, migrationsPath);

			// Apply once
			await runner.up();

			// Add another migration
			await createMigration(
				'20240102_create_posts',
				'db.run("CREATE TABLE posts (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE posts")',
			);

			// Apply again - should only apply the new one
			const results = await runner.up();

			expect(results).toHaveLength(1);
			expect(results[0]?.name).toBe('20240102_create_posts');
		});

		test('limits migrations with steps parameter', async () => {
			await createMigration(
				'20240101_first',
				'db.run("CREATE TABLE first (id TEXT)")',
				'db.run("DROP TABLE first")',
			);
			await createMigration(
				'20240102_second',
				'db.run("CREATE TABLE second (id TEXT)")',
				'db.run("DROP TABLE second")',
			);
			await createMigration(
				'20240103_third',
				'db.run("CREATE TABLE third (id TEXT)")',
				'db.run("DROP TABLE third")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			const results = await runner.up(2);

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.name)).toEqual(['20240101_first', '20240102_second']);

			// Third table should not exist
			const tables = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name='third'",
				)
				.all();
			expect(tables).toHaveLength(0);
		});

		test('rolls back on failure and stops processing', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);
			await createMigration(
				'20240102_bad_migration',
				'db.run("INVALID SQL SYNTAX HERE")',
				'db.run("SELECT 1")',
			);
			await createMigration(
				'20240103_create_posts',
				'db.run("CREATE TABLE posts (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE posts")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			const results = await runner.up();

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.status)).toEqual(['applied', 'failed']);
			expect(results[1]?.error).toBeDefined();

			// First migration should be applied
			const users = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
				)
				.all();
			expect(users).toHaveLength(1);

			// Third migration should not be applied (stopped after failure)
			const posts = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name='posts'",
				)
				.all();
			expect(posts).toHaveLength(0);
		});

		test('records applied migrations in migrations table', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			await runner.up();

			const applied = runner.getAppliedMigrations();
			expect(applied).toHaveLength(1);
			expect(applied[0]?.name).toBe('20240101_create_users');
			expect(applied[0]?.checksum).toBeString();
			expect(applied[0]?.appliedAt).toBeString();
		});
	});

	describe('down', () => {
		test('rolls back the last migration by default', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);
			await createMigration(
				'20240102_create_posts',
				'db.run("CREATE TABLE posts (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE posts")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			await runner.up();

			// Both tables should exist
			let tables = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'posts')",
				)
				.all();
			expect(tables).toHaveLength(2);

			// Rollback one
			const results = await runner.down();

			expect(results).toHaveLength(1);
			expect(results[0]).toMatchObject({
				status: 'rolled_back',
				name: '20240102_create_posts',
			});

			// Posts table should be gone, users should remain
			tables = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'posts')",
				)
				.all();
			expect(tables).toHaveLength(1);
			expect(tables[0]?.name).toBe('users');
		});

		test('rolls back multiple migrations with steps parameter', async () => {
			await createMigration(
				'20240101_first',
				'db.run("CREATE TABLE first (id TEXT)")',
				'db.run("DROP TABLE first")',
			);
			await createMigration(
				'20240102_second',
				'db.run("CREATE TABLE second (id TEXT)")',
				'db.run("DROP TABLE second")',
			);
			await createMigration(
				'20240103_third',
				'db.run("CREATE TABLE third (id TEXT)")',
				'db.run("DROP TABLE third")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			await runner.up();

			const results = await runner.down(2);

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.name)).toEqual(['20240103_third', '20240102_second']);

			// Only first table should remain
			const tables = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('first', 'second', 'third')",
				)
				.all();
			expect(tables).toHaveLength(1);
			expect(tables[0]?.name).toBe('first');
		});

		test('removes migration record from migrations table', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			await runner.up();

			expect(runner.getAppliedMigrations()).toHaveLength(1);

			await runner.down();

			expect(runner.getAppliedMigrations()).toHaveLength(0);
		});

		test('fails if migration file is missing', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			await runner.up();

			// Delete the migration file
			await rm(join(migrationsPath, '20240101_create_users.ts'));

			const results = await runner.down();

			expect(results).toHaveLength(1);
			expect(results[0]?.status).toBe('failed');
			expect(results[0]?.error?.message).toContain('Migration file not found');
		});

		test('stops on failure and rolls back transaction', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);
			await createMigration(
				'20240102_create_posts',
				'db.run("CREATE TABLE posts (id TEXT PRIMARY KEY)")',
				'db.run("INVALID SQL")', // Bad down migration
			);

			const runner = createMigrationRunner(db, migrationsPath);
			await runner.up();

			const results = await runner.down(2);

			expect(results).toHaveLength(1);
			expect(results[0]?.status).toBe('failed');

			// Both tables should still exist (second rollback failed, first never attempted)
			const tables = db
				.query<{ name: string }, []>(
					"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'posts')",
				)
				.all();
			expect(tables).toHaveLength(2);

			// Both migrations should still be recorded as applied
			expect(runner.getAppliedMigrations()).toHaveLength(2);
		});
	});

	describe('status', () => {
		test('shows pending migrations', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			const status = await runner.status();

			expect(status).toHaveLength(1);
			expect(status[0]?.name).toBe('20240101_create_users');
			expect(status[0]?.appliedAt).toBeNull();
			expect(status[0]?.checksumMatch).toBe(true);
		});

		test('shows applied migrations with appliedAt timestamp', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			await runner.up();

			const status = await runner.status();

			expect(status).toHaveLength(1);
			expect(status[0]?.appliedAt).not.toBeNull();
			expect(status[0]?.checksumMatch).toBe(true);
		});

		test('detects checksum mismatch when migration file changes', async () => {
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY)")',
				'db.run("DROP TABLE users")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			await runner.up();

			// Modify the migration file
			await createMigration(
				'20240101_create_users',
				'db.run("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT)")', // Changed!
				'db.run("DROP TABLE users")',
			);

			const status = await runner.status();

			expect(status).toHaveLength(1);
			expect(status[0]?.checksumMatch).toBe(false);
		});

		test('shows mixed status for multiple migrations', async () => {
			await createMigration(
				'20240101_first',
				'db.run("CREATE TABLE first (id TEXT)")',
				'db.run("DROP TABLE first")',
			);
			await createMigration(
				'20240102_second',
				'db.run("CREATE TABLE second (id TEXT)")',
				'db.run("DROP TABLE second")',
			);

			const runner = createMigrationRunner(db, migrationsPath);
			await runner.up(1); // Only apply first

			const status = await runner.status();

			expect(status).toHaveLength(2);
			expect(status.map((s) => ({ name: s.name, applied: s.appliedAt !== null }))).toEqual([
				{ name: '20240101_first', applied: true },
				{ name: '20240102_second', applied: false },
			]);
		});
	});
});
