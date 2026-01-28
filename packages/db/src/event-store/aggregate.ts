import type { Database } from 'bun:sqlite';
import type { StoredEvent } from './types';
import { loadSnapshot } from './snapshots';
import { getEvents } from './events';

export const rehydrateAggregate = <TState>(
	db: Database,
	aggregateType: string,
	aggregateId: string,
	initialState: TState,
	applyEvent: (state: TState, event: StoredEvent) => TState,
): { state: TState; version: number } => {
	const snapshot = loadSnapshot(db, aggregateType, aggregateId);

	const startState = snapshot ? (snapshot.state as TState) : initialState;
	const startVersion = snapshot ? snapshot.version : 0;

	const events = getEvents(db, aggregateType, aggregateId, startVersion);

	const state = events.reduce(applyEvent, startState);
	const version = events.at(-1)?.version ?? startVersion;

	return { state, version };
};
