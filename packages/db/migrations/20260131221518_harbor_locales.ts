import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`
		CREATE TABLE harbor_locales (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			is_default INTEGER NOT NULL DEFAULT 0,
			fallback_locale TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(harbor_id, code)
		)
	`);

	db.run('CREATE INDEX idx_harbor_locales_harbor ON harbor_locales(harbor_id)');
};

export const down = (db: Database) => {
	db.run('DROP INDEX IF EXISTS idx_harbor_locales_harbor');
	db.run('DROP TABLE IF EXISTS harbor_locales');
};
