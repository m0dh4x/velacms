import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	// Harbor roles - custom roles per harbor
	db.run(`
		CREATE TABLE harbor_roles (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			slug TEXT NOT NULL,
			description TEXT,
			permissions TEXT NOT NULL DEFAULT '{}',
			is_system INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(harbor_id, slug)
		)
	`);

	// Harbor members - membership within a harbor with role reference
	db.run(`
		CREATE TABLE harbor_members (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
			role_id TEXT NOT NULL REFERENCES harbor_roles(id) ON DELETE RESTRICT,
			permissions TEXT NOT NULL DEFAULT '{}',
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(user_id, harbor_id)
		)
	`);

	// Organization members - simple membership (owner or not)
	db.run(`
		CREATE TABLE organization_members (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
			is_owner INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(user_id, organization_id)
		)
	`);
};

export const down = (db: Database) => {
	db.run(`DROP TABLE IF EXISTS organization_members`);
	db.run(`DROP TABLE IF EXISTS harbor_members`);
	db.run(`DROP TABLE IF EXISTS harbor_roles`);
};
