import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	db.run(`
		CREATE TABLE asset_folders (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			parent_id TEXT REFERENCES asset_folders(id) ON DELETE CASCADE,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run(`
		CREATE TABLE assets (
			id TEXT PRIMARY KEY,
			harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
			filename TEXT NOT NULL,
			original_filename TEXT NOT NULL,
			mime_type TEXT NOT NULL,
			size INTEGER NOT NULL,
			storage_key TEXT NOT NULL,
			metadata TEXT NOT NULL DEFAULT '{}',
			folder_id TEXT REFERENCES asset_folders(id) ON DELETE SET NULL,
			created_by TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	db.run(`
		CREATE TABLE asset_translations (
			id TEXT PRIMARY KEY,
			asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
			locale TEXT NOT NULL,
			alt TEXT,
			title TEXT,
			caption TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			UNIQUE(asset_id, locale)
		)
	`);

	db.run('CREATE INDEX idx_asset_folders_harbor ON asset_folders(harbor_id)');
	db.run('CREATE INDEX idx_asset_folders_parent ON asset_folders(parent_id)');
	db.run('CREATE INDEX idx_assets_harbor ON assets(harbor_id)');
	db.run('CREATE INDEX idx_assets_folder ON assets(folder_id)');
	db.run('CREATE INDEX idx_asset_translations_asset ON asset_translations(asset_id)');
};

export const down = (db: Database) => {
	db.run('DROP INDEX IF EXISTS idx_asset_translations_asset');
	db.run('DROP INDEX IF EXISTS idx_assets_folder');
	db.run('DROP INDEX IF EXISTS idx_assets_harbor');
	db.run('DROP INDEX IF EXISTS idx_asset_folders_parent');
	db.run('DROP INDEX IF EXISTS idx_asset_folders_harbor');
	db.run('DROP TABLE IF EXISTS asset_translations');
	db.run('DROP TABLE IF EXISTS assets');
	db.run('DROP TABLE IF EXISTS asset_folders');
};
