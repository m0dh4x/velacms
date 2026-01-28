import type { Database } from 'bun:sqlite';
import type { EventRow, NewEvent, Snapshot, SnapshotRow, StoredEvent } from './types';

/*
  All functions related to event storage and retrieval
*/

// helper function to map event row data to stored event data (snake_case to camelCase)
const mapRowToEvent = (row: EventRow): StoredEvent => ({
	sequence: row.sequence,
	id: row.id,
	harborId: row.harbor_id,
	aggregateType: row.aggregate_type,
	aggregateId: row.aggregate_id,
	eventType: row.event_type,
	version: row.version,
	payload: JSON.parse(row.payload),
	metadata: row.metadata ? JSON.parse(row.metadata) : null,
	createdAt: row.created_at,
});

export const appendEvent = (db: Database, event: NewEvent): StoredEvent => {
	const statement = db.prepare<
		EventRow,
		[string, string | null, string, string, string, number, string, string | null]
	>(`
  	INSERT INTO events (id, harbor_id, aggregate_type, aggregate_id, event_type, version, payload, metadata)
  	VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  	RETURNING sequence, id, harbor_id, aggregate_type, aggregate_id, event_type, version, payload, metadata, created_at
  `);

	const result = statement.get(
		event.id,
		event.harborId ?? null,
		event.aggregateType,
		event.aggregateId,
		event.eventType,
		event.version,
		JSON.stringify(event.payload),
		event.metadata ? JSON.stringify(event.metadata) : null,
	);

	if (!result) {
		throw new Error(`Failed to append event: ${event.id}`);
	}

	return mapRowToEvent(result);
};

export const getEvents = (
	db: Database,
	aggregateType: string,
	aggregateId: string,
): StoredEvent[] => {
	const statement = db.prepare<EventRow, [string, string]>(`
    SELECT sequence, id, harbor_id, aggregate_type, aggregate_id, event_type, version, payload, metadata, created_at
    FROM events WHERE aggregate_type = ?  AND aggregate_id = ?
    ORDER BY version ASC
  `);

	const rows = statement.all(aggregateType, aggregateId);

	return rows.map(mapRowToEvent);
};

export const getEventByType = (db: Database, eventType: string, limit?: number): StoredEvent[] => {
	const statement = db.prepare<EventRow, [string, number]>(`
    SELECT sequence, id, harbor_id, aggregate_type, aggregate_id, event_type, version, payload, metadata, created_at
    FROM events WHERE event_type = ? ORDER BY version ASC
    LIMIT ?
  `);

	// make limiting optional
	const rows = statement.all(eventType, limit ?? -1);

	return rows.map(mapRowToEvent);
};

/*
  All functions related snapshots
*/
export const saveSnapshot = (
	db: Database,
	aggregateType: string,
	aggregateId: string,
	version: number,
	state: unknown,
): void => {
	const statement = db.prepare(`
    INSERT OR REPLACE INTO snapshots (aggregate_type, aggregate_id, version, state)
    VALUES (?, ?, ?, ?)
  `);

	statement.run(aggregateType, aggregateId, version, JSON.stringify(state));
};

export const loadSnapshot = (
	db: Database,
	aggregateType: string,
	aggregateId: string,
): Snapshot | null => {
	const statement = db.prepare<SnapshotRow, [string, string]>(`
    SELECT aggregate_type, aggregate_id, version, state, created_at
    FROM snapshots
    WHERE aggregate_type = ? AND aggregate_id = ?
    `);

	const result = statement.get(aggregateType, aggregateId);
	if (!result) return null;

	return {
		aggregateType: result.aggregate_type,
		aggregateId: result.aggregate_id,
		version: result.version,
		state: JSON.parse(result.state),
		createdAt: result.created_at,
	};
};
