import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`
		CREATE TABLE content_feedback (
			id TEXT PRIMARY KEY,
			content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
			field_path TEXT NOT NULL,
			user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			message TEXT NOT NULL,
			resolved INTEGER NOT NULL DEFAULT 0,
			resolved_by TEXT REFERENCES user(id) ON DELETE SET NULL,
			resolved_at TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run('CREATE INDEX idx_content_feedback_content ON content_feedback(content_id)');
};

export const down = (db: Database) => {
	db.run('DROP INDEX IF EXISTS idx_content_feedback_content');
	db.run('DROP TABLE IF EXISTS content_feedback');
};
