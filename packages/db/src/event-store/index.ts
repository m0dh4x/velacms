import type { Database } from 'bun:sqlite';
import type { EventRow, NewEvent, StoredEvent } from './types';

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

	return {
		sequence: result.sequence,
		id: result.id,
		harborId: result.harbor_id,
		aggregateType: result.aggregate_type,
		aggregateId: result.aggregate_id,
		eventType: result.event_type,
		version: result.version,
		payload: JSON.parse(result.payload),
		metadata: result.metadata ? JSON.parse(result.metadata) : null,
		createdAt: result.created_at,
	};
};

export const getEvents = (
	db: Database,
	aggregateType: string,
	aggregateId: string,
): StoredEvent[] => {
	const statement = db.prepare<EventRow, [string, string]>(`
    SELECT sequence, id, harbor_id, aggregate_type, aggregate_id, eventType, version, payload, metadata, created_at
    FROM events WHERE aggregate_type = ?  AND aggregate_id = ? AND version = ?
    ORDER BY version ASC
  `);

	const rows = statement.all(aggregateType, aggregateId);

	return rows.map((row) => ({
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
	}));
};
