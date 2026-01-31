import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`
		CREATE TABLE workflows (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			description TEXT,
			states TEXT NOT NULL DEFAULT '[]',
			transitions TEXT NOT NULL DEFAULT '[]',
			initial_state TEXT NOT NULL,
			is_default INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(harbor_id, name)
		)
	`);

	db.run('CREATE INDEX idx_workflows_harbor ON workflows(harbor_id)');
};

export const down = (db: Database) => {
	db.run('DROP INDEX IF EXISTS idx_workflows_harbor');
	db.run('DROP TABLE IF EXISTS workflows');
};
