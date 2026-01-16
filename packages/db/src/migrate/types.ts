import type { Database } from 'bun:sqlite';

/**
 * Available migration functions.
 * - up: applies the migration (e.g., CREATE TABLE)
 * - down: reverts the migration (e.g., DROP TABLE)
 */
export type Migration = {
	up: (db: Database) => void | Promise<void>;
	down: (db: Database) => void | Promise<void>;
};

/**
 * A single entry in the migrations table.
 * Tracks which migrations have been applied to the database.
 */
export type MigrationRecord = {
	id: number;
	name: string;
	checksum: string;
	appliedAt: string;
};

/**
 * A migration file discovered on disk.
 * Contains the loaded migration functions and metadata.
 */
export type MigrationFile = {
	name: string; // filename without .ts extension
	path: string; // absolute path to the file
	checksum: string; // SHA-256 hash to detect changes
	migration: Migration; // the imported up/down functions
};

/**
 * Result of running a single migration.
 * Returned by up() and down() to report what happened.
 */
export type MigrationResult = {
	name: string;
	status: 'applied' | 'rolled_back' | 'skipped' | 'failed';
	error?: Error; // only set if status is "failed"
};

/**
 * Status of a migration for the status command.
 * Shows whether it's applied and if the file has changed.
 */
export type MigrationStatus = {
	name: string;
	appliedAt: string | null;
	checksum: string;
	checksumMatch: boolean;
};
