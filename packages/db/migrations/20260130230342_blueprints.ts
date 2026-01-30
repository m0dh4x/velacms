import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`
		CREATE TABLE blueprints (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			slug TEXT NOT NULL,
			description TEXT,
			icon TEXT,
			type TEXT NOT NULL CHECK (type IN ('fragment', 'entity')),
			schema TEXT NOT NULL DEFAULT '{}',
			settings TEXT NOT NULL DEFAULT '{}',
			version INTEGER NOT NULL DEFAULT 1,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(harbor_id, slug)
		)
	`);

	db.run('CREATE INDEX idx_blueprints_harbor ON blueprints(harbor_id)');
	db.run('CREATE INDEX idx_blueprints_type ON blueprints(harbor_id, type)');
};

export const down = (db: Database) => {
	db.run('DROP INDEX IF EXISTS idx_blueprints_type');
	db.run('DROP INDEX IF EXISTS idx_blueprints_harbor');
	db.run('DROP TABLE IF EXISTS blueprints');
};
