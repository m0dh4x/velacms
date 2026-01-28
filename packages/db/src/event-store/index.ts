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
