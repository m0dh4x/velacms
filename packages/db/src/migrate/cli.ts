/**
 * CLI for running database migrations.
 *
 * Usage:
 *   bun run migrate <command> [args]
 *
 * Commands:
 *   up [steps]     - Apply pending migrations (all if steps not specified)
 *   down [steps]   - Rollback migrations (default: 1)
 *   status         - Show which migrations are applied/pending
 *   create <name>  - Generate a new migration file
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from '../index';
import { createMigrationRunner } from './runner';

// Path where migration files are stored
const MIGRATIONS_PATH = join(import.meta.dir, '../../migrations');

// Create the migration runner using the shared db instance
const runner = createMigrationRunner(db, MIGRATIONS_PATH);

// Get the command from command line arguments
// e.g., "bun run migrate up" -> command = "up"
const command = process.argv[2];

/**
 * Formats a Date into a timestamp string for migration filenames.
 * Example: 2024-01-15T12:30:45.000Z -> "20240115123045"
 */
const formatDate = (date: Date) => {
	return date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
};

/**
 * Available CLI commands.
 * Each command is an async function that reads additional args from process.argv.
 */
const commands: Record<string, () => Promise<void>> = {
	/**
	 * Apply pending migrations.
	 * Usage: migrate up [steps]
	 */
	async up() {
		// Optional: limit number of migrations to apply
		const steps = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

		const results = await runner.up(steps);

		if (results.length === 0) {
			console.log('No pending migrations');
			return;
		}

		// Print result for each migration
		for (const result of results) {
			if (result.status === 'applied') {
				console.log(`✓ ${result.name}`);
			} else if (result.status === 'failed') {
				console.log(`✗ ${result.name}: ${result.error?.message}`);
			}
		}
	},

	/**
	 * Rollback applied migrations.
	 * Usage: migrate down [steps]
	 */
	async down() {
		// Default to rolling back 1 migration
		const steps = process.argv[3] ? parseInt(process.argv[3], 10) : 1;

		const results = await runner.down(steps);

		if (results.length === 0) {
			console.log('No migrations to rollback');
			return;
		}

		// Print result for each migration
		for (const result of results) {
			if (result.status === 'rolled_back') {
				console.log(`↩ ${result.name}`);
			} else if (result.status === 'failed') {
				console.log(`✗ ${result.name}: ${result.error?.message}`);
			}
		}
	},

	/**
	 * Show status of all migrations.
	 * Usage: migrate status
	 */
	async status() {
		const statuses = await runner.status();

		if (statuses.length === 0) {
			console.log('No migrations found');
			return;
		}

		// Print each migration's status
		for (const s of statuses) {
			const applied = s.appliedAt ? `applied ${s.appliedAt}` : 'pending';
			// Warn if the file has changed since it was applied
			const checksum = s.checksumMatch ? '' : ' (checksum mismatch!)';
			console.log(`${s.appliedAt ? '✓' : '○'} ${s.name} - ${applied}${checksum}`);
		}
	},

	/**
	 * Create a new migration file.
	 * Usage: migrate create <name>
	 *
	 * Creates a file like: 20240115123045_<name>.ts
	 */
	async create() {
		const name = process.argv[3];

		if (!name) {
			console.error('Usage: migrate create <name>');
			process.exit(1);
		}

		// Ensure the migrations folder exists
		await mkdir(MIGRATIONS_PATH, { recursive: true });

		// Generate filename with timestamp prefix
		const timestamp = formatDate(new Date());
		const filename = `${timestamp}_${name}.ts`;
		const filepath = join(MIGRATIONS_PATH, filename);

		// Migration file template
		const template = `import type { Database } from "bun:sqlite";

export const up = (db: Database) => {
  // TODO: implement migration
};

export const down = (db: Database) => {
  // TODO: implement rollback
};
`;

		await writeFile(filepath, template);
		console.log(`Created ${filename}`);
	},
};

/**
 * Main entry point.
 * Validates the command and runs it.
 */
const run = async () => {
	if (!command || !commands[command]) {
		console.log('Usage: migrate <command> [args]');
		console.log('');
		console.log('Commands:');
		console.log('  up [steps]     Apply pending migrations');
		console.log('  down [steps]   Rollback migrations (default: 1)');
		console.log('  status         Show migration status');
		console.log('  create <name>  Create a new migration file');
		process.exit(1);
	}

	await commands[command]();
};

// Run the CLI and handle any errors
run().catch((err) => {
	console.error(err);
	process.exit(1);
});
