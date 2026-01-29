import { describe, test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { appendEvent, getEvents } from '../events';
import { saveSnapshot, loadSnapshot } from '../snapshots';
import { rehydrateAggregate } from '../aggregate';

let db: Database;

beforeEach(() => {
	db = new Database(':memory:');

	db.run(`
		CREATE TABLE events (
			sequence INTEGER PRIMARY KEY AUTOINCREMENT,
			id TEXT NOT NULL UNIQUE,
			harbor_id TEXT,
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

	db.run(`
		CREATE TABLE snapshots (
			aggregate_type TEXT NOT NULL,
			aggregate_id TEXT NOT NULL,
			version INTEGER NOT NULL,
			state TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			PRIMARY KEY (aggregate_type, aggregate_id)
		)
	`);
});

describe('Event Store Integration', () => {
	test('append events and rehydrate aggregate', () => {
		appendEvent(db, {
			id: 'event-1',
			harborId: 'harbor-1',
			aggregateType: 'Fragment',
			aggregateId: 'hero-1',
			eventType: 'FragmentCreated',
			version: 1,
			payload: {
				blueprintId: 'hero-blueprint',
				data: {
					title: 'Hero Title',
					content: 'Hero Content',
				},
			},
		});

		appendEvent(db, {
			id: 'event-2',
			harborId: 'harbor-1',
			aggregateType: 'Page',
			aggregateId: 'page-home',
			eventType: 'PageCreated',
			version: 1,
			payload: {
				title: 'Home Page',
				slug: 'home',
				refs: [],
			},
		});

		appendEvent(db, {
			id: 'event-3',
			harborId: 'harbor-1',
			aggregateType: 'Page',
			aggregateId: 'page-home',
			eventType: 'FragmentAdded',
			version: 2,
			payload: {
				fragmentId: 'hero-1',
				position: 0,
			},
		});

		// Event 4: Title ändern
		appendEvent(db, {
			id: 'event-4',
			harborId: 'harbor-1',
			aggregateType: 'Page',
			aggregateId: 'page-home',
			eventType: 'PageUpdated',
			version: 3,
			payload: {
				title: 'Welcome Home',
			},
		});

		// Rehydrate
		type PageState = {
			title: string;
			slug: string;
			refs: Array<{ fragmentId: string; position: number }>;
		};

		const { state, version } = rehydrateAggregate<PageState>(
			db,
			'Page',
			'page-home',
			{ title: '', slug: '', refs: [] },
			(state, event) => {
				switch (event.eventType) {
					case 'PageCreated':
						return { ...state, ...(event.payload as any) };
					case 'FragmentAdded':
						const { fragmentId, position } = event.payload as any;
						return { ...state, refs: [...state.refs, { fragmentId, position }] };
					case 'PageUpdated':
						return { ...state, ...(event.payload as any) };
					default:
						return state;
				}
			},
		);

		// Assertions
		expect(version).toBe(3);
		expect(state.title).toBe('Welcome Home'); // Geändert in Event 3
		expect(state.slug).toBe('home'); // Aus Event 1
		expect(state.refs).toHaveLength(1); // Aus Event 2
		expect(state.refs[0]?.fragmentId).toBe('hero-1');
	});

	test('appendEvent fails on duplicate version', () => {
		appendEvent(db, {
			id: 'event-1',
			harborId: 'harbor-1',
			aggregateType: 'Page',
			aggregateId: 'page-home',
			eventType: 'PageCreated',
			version: 1,
			payload: { title: 'Home' },
		});

		expect(() => {
			appendEvent(db, {
				id: 'event-2',
				harborId: 'harbor-1',
				aggregateType: 'Page',
				aggregateId: 'page-home',
				eventType: 'PageUpdated',
				version: 1, // Duplicate version!
				payload: { title: 'Updated' },
			});
		}).toThrow();
	});

	test('getEvents filters by fromVersion', () => {
		appendEvent(db, {
			id: 'event-1',
			aggregateType: 'Page',
			aggregateId: 'page-home',
			eventType: 'PageCreated',
			version: 1,
			payload: { title: 'Home' },
		});

		appendEvent(db, {
			id: 'event-2',
			aggregateType: 'Page',
			aggregateId: 'page-home',
			eventType: 'PageUpdated',
			version: 2,
			payload: { title: 'Updated' },
		});

		appendEvent(db, {
			id: 'event-3',
			aggregateType: 'Page',
			aggregateId: 'page-home',
			eventType: 'PagePublished',
			version: 3,
			payload: {},
		});

		const events = getEvents(db, 'Page', 'page-home', 1);

		expect(events).toHaveLength(2);
		expect(events[0]?.version).toBe(2);
		expect(events[1]?.version).toBe(3);
	});

	test('rehydrate uses snapshot as starting point', () => {
		// Snapshot at version 2
		saveSnapshot(db, 'Page', 'page-home', 2, {
			title: 'Snapshot Title',
			slug: 'home',
			refs: [{ fragmentId: 'hero-1', position: 0 }],
		});

		// Event after snapshot
		appendEvent(db, {
			id: 'event-3',
			aggregateType: 'Page',
			aggregateId: 'page-home',
			eventType: 'PageUpdated',
			version: 3,
			payload: { title: 'Updated After Snapshot' },
		});

		type PageState = {
			title: string;
			slug: string;
			refs: Array<{ fragmentId: string; position: number }>;
		};

		const { state, version } = rehydrateAggregate<PageState>(
			db,
			'Page',
			'page-home',
			{ title: '', slug: '', refs: [] },
			(state, event) => {
				if (event.eventType === 'PageUpdated') {
					return { ...state, ...(event.payload as any) };
				}
				return state;
			},
		);

		expect(version).toBe(3);
		expect(state.title).toBe('Updated After Snapshot');
		expect(state.slug).toBe('home'); // From snapshot
		expect(state.refs).toHaveLength(1); // From snapshot
	});

	test('getEvents returns empty array for new aggregate', () => {
		const events = getEvents(db, 'Page', 'non-existent');

		expect(events).toEqual([]);
	});

	test('loadSnapshot returns null if not exists', () => {
		const snapshot = loadSnapshot(db, 'Page', 'non-existent');

		expect(snapshot).toBeNull();
	});

	test('rehydrate empty aggregate returns initial state', () => {
		type PageState = {
			title: string;
			slug: string;
		};

		const { state, version } = rehydrateAggregate<PageState>(
			db,
			'Page',
			'non-existent',
			{ title: 'default', slug: '' },
			(state) => state,
		);

		expect(version).toBe(0);
		expect(state.title).toBe('default');
		expect(state.slug).toBe('');
	});
});
