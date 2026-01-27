import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	// create event store table
	db.run(`
    CREATE TABLE events (
  		sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  		id TEXT NOT NULL UNIQUE,
  		harbor_id TEXT REFERENCES harbors(id) ON DELETE CASCADE,
  		aggregate_type TEXT NOT NULL,
  		aggregate_id TEXT NOT NULL,
  		event_type TEXT NOT NULL,
  		version INTEGER NOT NULL,
  		payload TEXT NOT NULL,
  		metadata TEXT,
  		created_at TEXT NOT NULL DEFAULT (datetime('now')),

      UNIQUE (aggregate_type, aggregate_id, version)
    )
	`);

	// create snapshot table for caching aggregates
	db.run(`
    CREATE TABLE snapshots (
      aggregate_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      PRIMARY KEY (aggregate_type, aggregate_id)
    );
  `);

	// tracks last_offset per client for realtime-sync
	db.run(`
    CREATE TABLE sync_cursors (
    id TEXT PRIMARY KEY,
    harbor_id TEXT NOT NULL REFERENCES harbors(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    last_sequence INTEGER NOT NULL DEFAULT 0,
    last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(harbor_id, client_id)
    );
  `);

	db.run('CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id, version)');
	db.run('CREATE INDEX idx_events_harbor ON events(harbor_id, sequence)');
	db.run('CREATE INDEX idx_events_type ON events(event_type, created_at)');
};

export const down = (db: Database) => {
	db.run('DROP TABLE IF EXISTS sync_cursors');
	db.run('DROP TABLE IF EXISTS snapshots');

	// DROP indexes before drop table
	db.run('DROP INDEX IF EXISTS idx_events_type');
	db.run('DROP INDEX IF EXISTS idx_events_harbor');
	db.run('DROP INDEX IF EXISTS idx_events_aggregate');

	db.run('DROP TABLE IF EXISTS events');
};
