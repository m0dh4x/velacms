import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`
	  CREATE TABLE content (
			id TEXT NOT NULL PRIMARY KEY,
			harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
			blueprint_id TEXT NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
			canonical_id TEXT NOT NULL,
			locale TEXT NOT NULL,
			slug TEXT NOT NULL,
			title TEXT NOT NULL,
			data TEXT NOT NULL,
			workflow_state TEXT,
			version INTEGER NOT NULL,
			published_at DATETIME,
			created_by TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			updated_by TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			created_at DATETIME NOT NULL DEFAULT (datetime('now')),
			updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
			)
  `);

	db.run(`
    CREATE TABLE content_refs(
      id TEXT NOT NULL PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      target_canonical_id TEXT NOT NULL,
      field_path TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `);

	db.run('CREATE INDEX idx_content_harbor ON content(harbor_id)');
	db.run('CREATE INDEX idx_content_canonical ON content(canonical_id)');
	db.run('CREATE INDEX idx_content_slug ON content(harbor_id, locale, slug)');

	db.run('CREATE INDEX idx_content_refs_target ON content_refs(target_canonical_id)');
};

export const down = (db: Database) => {
	db.run('DROP INDEX idx_content_harbor');
	db.run('DROP INDEX idx_content_canonical');
	db.run('DROP INDEX idx_content_slug');
	db.run('DROP INDEX idx_content_refs_target');
	db.run('DROP TABLE content_refs');
	db.run('DROP TABLE content');
};
