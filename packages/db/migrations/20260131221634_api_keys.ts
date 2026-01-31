import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`
		CREATE TABLE api_keys (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			key_hash TEXT NOT NULL UNIQUE,
			permissions TEXT NOT NULL DEFAULT '{}',
			last_used_at TEXT,
			expires_at TEXT,
			created_by TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run('CREATE INDEX idx_api_keys_harbor ON api_keys(harbor_id)');
};

export const down = (db: Database) => {
	db.run('DROP INDEX IF EXISTS idx_api_keys_harbor');
	db.run('DROP TABLE IF EXISTS api_keys');
};
