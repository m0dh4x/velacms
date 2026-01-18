import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`
    CREATE TABLE organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      settings TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )`);

	db.run(`
    CREATE TABLE harbors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      settings TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now')),

      organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE
    )`);
};

export const down = (db: Database) => {
	db.run(`DROP TABLE harbors`);
	db.run(`DROP TABLE organizations`);
};
