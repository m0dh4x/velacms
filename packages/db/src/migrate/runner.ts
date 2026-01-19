import { Database } from 'bun:sqlite';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type {
	Migration,
	MigrationFile,
	MigrationRecord,
	MigrationResult,
	MigrationStatus,
} from './types';

/**
 * Creates a migration runner for the given database.
 */
export function createMigrationRunner(db: Database, migrationsPath: string) {
	/**
	 * Creates the migrations table if it doesn't exist.
	 * Tracks which migrations have been applied.
	 */
	const ensureMigrationsTable = () => {
		db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
	};

	/**
	 * Fetches all migrations that have been applied to the database.
	 */
	const getAppliedMigrations = (): MigrationRecord[] => {
		return db.query<MigrationRecord, []>('SELECT * FROM migrations ORDER BY id').all();
	};

	/**
	 * Detects if a migration file has been modified after being applied.
	 */
	const computeChecksum = async (filePath: string): Promise<string> => {
		const file = Bun.file(filePath);
		const content = await file.text();
		const hash = new Bun.CryptoHasher('sha256');
		hash.update(content);
		return hash.digest('hex');
	};

	/**
	 * Gets all migration files from migrations folder.
	 *
	 * Migration files must:
	 * - Have a .ts extension (excluding .d.ts)
	 * - Migration files need to export an 'up' and a
	 *
	 * Files are sorted alphabetically, so name them with timestamps:
	 * e.g., 20240115120000_create_users.ts
	 */
	const getMigrationFiles = async (): Promise<MigrationFile[]> => {
		const files = await readdir(migrationsPath);

		// Filter to only .ts files, excluding type declaration files
		const migrationFiles = files.filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts')).sort(); // Alphabetical sort ensures consistent order

		const migrations: MigrationFile[] = [];

		for (const file of migrationFiles) {
			const filePath = join(migrationsPath, file);
			const checksum = await computeChecksum(filePath);

			// Dynamically import the migration file
			const migration = (await import(filePath)) as Migration;

			// Validate that the file exports the required functions
			if (typeof migration.up !== 'function' || typeof migration.down !== 'function') {
				throw new Error(`Migration ${file} must export 'up' and 'down' functions`);
			}

			migrations.push({
				name: file.replace(/\.ts$/, ''),
				path: filePath,
				checksum,
				migration,
			});
		}

		return migrations;
	};

	/**
	 * Applies pending migrations to the database.
	 *
	 * Each migration runs in a transaction:
	 * - If the migration succeeds, it's recorded in the migrations table
	 * - If it fails, the transaction is rolled back and we stop
	 */
	const up = async (steps?: number): Promise<MigrationResult[]> => {
		ensureMigrationsTable();

		// Get names of already-applied migrations
		const applied = getAppliedMigrations();
		const appliedNames = new Set(applied.map((m) => m.name));

		// Find all migration files on disk
		const migrations = await getMigrationFiles();

		// Filter to only migrations that haven't been applied yet
		const pending = migrations.filter((m) => !appliedNames.has(m.name));

		// Optionally limit how many to apply
		const toApply = steps ? pending.slice(0, steps) : pending;

		const results: MigrationResult[] = [];

		for (const migration of toApply) {
			try {
				// Start a transaction so we can rollback if something fails
				db.run('BEGIN TRANSACTION');

				// Run the migration's up function
				await migration.migration.up(db);

				// Record that this migration was applied
				db.run('INSERT INTO migrations (name, checksum) VALUES (?, ?)', [
					migration.name,
					migration.checksum,
				]);

				// Commit the transaction
				db.run('COMMIT');

				results.push({ name: migration.name, status: 'applied' });
			} catch (error) {
				// Something went wrong - rollback and stop processing
				db.run('ROLLBACK');

				results.push({
					name: migration.name,
					status: 'failed',
					error: error instanceof Error ? error : new Error(String(error)),
				});

				// Stop on first failure - don't try to apply more migrations
				break;
			}
		}

		return results;
	};

	/**
	 * Rolls back applied migrations.
	 *
	 * @param steps - How many migrations to rollback (default: 1)
	 * @returns Array of results showing what happened to each migration.
	 *
	 * Migrations are rolled back in reverse order (most recent first).
	 * Each rollback runs in a transaction for safety.
	 */
	const down = async (steps = 1): Promise<MigrationResult[]> => {
		ensureMigrationsTable();

		// Get applied migrations from the database
		const applied = getAppliedMigrations();

		// Load migration files to get the down functions
		const migrations = await getMigrationFiles();
		const migrationMap = new Map(migrations.map((m) => [m.name, m]));

		// Take the last N applied migrations and reverse them
		// (we rollback most recent first)
		const toRollback = applied.slice(-steps).reverse();

		const results: MigrationResult[] = [];

		for (const record of toRollback) {
			// Find the migration file for this record
			const migration = migrationMap.get(record.name);

			if (!migration) {
				// The migration file was deleted - we can't rollback
				results.push({
					name: record.name,
					status: 'failed',
					error: new Error(`Migration file not found: ${record.name}`),
				});
				break;
			}

			try {
				// Start a transaction
				db.run('BEGIN TRANSACTION');

				// Run the migration's down function
				await migration.migration.down(db);

				// Remove the record from the migrations table
				db.run('DELETE FROM migrations WHERE name = ?', [record.name]);

				// Commit the transaction
				db.run('COMMIT');

				results.push({ name: record.name, status: 'rolled_back' });
			} catch (error) {
				// Something went wrong - rollback and stop
				db.run('ROLLBACK');

				results.push({
					name: record.name,
					status: 'failed',
					error: error instanceof Error ? error : new Error(String(error)),
				});

				break;
			}
		}

		return results;
	};

	/**
	 * Returns the status of all migrations.
	 *
	 * Shows:
	 * - Which migrations have been applied and when
	 * - Which migrations are still pending
	 * - Whether any applied migration's file has changed (checksum mismatch)
	 */
	const status = async (): Promise<MigrationStatus[]> => {
		ensureMigrationsTable();

		// Get applied migrations from database
		const applied = getAppliedMigrations();
		const appliedMap = new Map(applied.map((m) => [m.name, m]));

		// Get all migration files from disk
		const migrations = await getMigrationFiles();

		// Build status for each migration file
		return migrations.map((m) => {
			const record = appliedMap.get(m.name);

			return {
				name: m.name,
				appliedAt: record?.appliedAt ?? null,
				checksum: m.checksum,
				// If applied, check if the file has changed since
				checksumMatch: record ? record.checksum === m.checksum : true,
			};
		});
	};

	return { up, down, status, getMigrationFiles, getAppliedMigrations };
}
