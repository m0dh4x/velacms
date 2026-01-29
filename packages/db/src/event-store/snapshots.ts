import type { Database } from 'bun:sqlite';
import type { Snapshot, SnapshotRow } from './types';

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
	try {
		return {
			aggregateType: result.aggregate_type,
			aggregateId: result.aggregate_id,
			version: result.version,
			state: JSON.parse(result.state),
			createdAt: result.created_at,
		};
	} catch {
		// oxlint-disable-next-line no-console
		console.warn(`Corrupted snapshot for ${aggregateType}-${aggregateId}: Invalid JSON`);
		return null;
	}
};
