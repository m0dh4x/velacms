import { Database } from 'bun:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'vela.db');

/**
 * Shared SQLite database instance for the entire application.
 * All parts of the app (API, migrations, etc.) should import this.
 */
export const db = new Database(dbPath, { create: true });

// Write-Ahead Logging for better concurrency
db.run('PRAGMA journal_mode = WAL;');

// Enforce foreign key constraints
db.run('PRAGMA foreign_keys = ON;');

// Export event store
export * from './event-store';
