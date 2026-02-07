import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`ALTER TABLE harbor_members ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0`);
};

export const down = (_db: Database) => {
	// TODO: implement rollback
};
