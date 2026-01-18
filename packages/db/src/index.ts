import { Database } from 'bun:sqlite';

/**
 * Shared SQLite database instance for the entire application.
 * All parts of the app (API, migrations, etc.) should import this.
 */
export const db = new Database('./data/vela.db', { create: true });

// Write-Ahead Logging for better concurrency
db.run('PRAGMA journal_mode = WAL;');

// Enforce foreign key constraints
db.run('PRAGMA foreign_keys = ON;');