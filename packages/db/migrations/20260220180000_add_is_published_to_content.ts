import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`ALTER TABLE content ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0`);
	db.run('CREATE INDEX idx_content_published ON content(harbor_id, is_published)');
};

export const down = (db: Database) => {
	db.run('DROP INDEX IF EXISTS idx_content_published');
	db.run('ALTER TABLE content DROP COLUMN is_published');
};
