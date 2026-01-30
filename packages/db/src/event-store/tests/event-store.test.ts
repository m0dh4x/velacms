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
	describe('write and read events ', () => {
		test('appendEvent returns stored event', () => {
			const storedEvent = appendEvent(db, {
				id: 'event-1',
				harborId: 'harbor-1',
				aggregateType: 'Page',
				aggregateId: 'page-home',
				eventType: 'PageCreated',
				version: 1,
				payload: {
					title: 'Welcome Home',
				},
			});

			expect(storedEvent).toEqual({
				sequence: 1,
				id: 'event-1',
				harborId: 'harbor-1',
				aggregateType: 'Page',
				aggregateId: 'page-home',
				eventType: 'PageCreated',
				version: 1,
				payload: {
					title: 'Welcome Home',
				},
				metadata: null,
				createdAt: expect.any(String),
			});
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

		test('getEvents returns empty array for new aggregate', () => {
			const events = getEvents(db, 'Page', 'non-existent');

			expect(events).toEqual([]);
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
	});

	describe('save and load snapshots', () => {
		test('saveSnapshot and loadSnapshot', () => {
			saveSnapshot(db, 'Page', 'page-home', 3, { title: 'Updated' });
			const snapshot = loadSnapshot(db, 'Page', 'page-home');
			expect(snapshot?.version).toBe(3);
			expect(snapshot?.state).toEqual({ title: 'Updated' });
		});

		test('loadSnapshot returns null if not exists', () => {
			const snapshot = loadSnapshot(db, 'Page', 'non-existent');

			expect(snapshot).toBeNull();
		});

		test('loadSnapshot returns null and logs error invalid JSON', () => {
			db.run(
				`
      INSERT INTO snapshots (aggregate_type, aggregate_id, version, state, created_at)
      VALUES (?,?,?,?, datetime('now'))`,
				['Page', 'invalid-json', 1, 'invalid-json{'],
			);

			const snapshot = loadSnapshot(db, 'Page', 'invalid-json');
			expect(snapshot).toBeNull();
		});
	});

	describe('aggregate rehydration', () => {
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

		test('rehydrate ignores events before snapshot version', () => {
			// Event before snapshot
			appendEvent(db, {
				id: 'event-1',
				aggregateType: 'Page',
				aggregateId: 'page-snap',
				eventType: 'PageCreated',
				version: 1,
				payload: { title: 'Old Title' },
			});

			// Snapshot at version 2
			saveSnapshot(db, 'Page', 'page-snap', 2, { title: 'Snapshot Title' });

			// Event after snapshot
			appendEvent(db, {
				id: 'event-3',
				aggregateType: 'Page',
				aggregateId: 'page-snap',
				eventType: 'PageUpdated',
				version: 3,
				payload: { title: 'New Title' },
			});

			type PageState = { title: string };

			const { state, version } = rehydrateAggregate<PageState>(
				db,
				'Page',
				'page-snap',
				{ title: '' },
				(state, event) => ({ ...state, ...(event.payload as any) }),
			);

			// Event v1 should be ignored, only snapshot + event v3 applied
			expect(version).toBe(3);
			expect(state.title).toBe('New Title');
		});

		test('rehydrate sorts events by version even if inserted out of order', () => {
			// Insert version 2 before version 1 to test ORDER BY
			db.run(
				`INSERT INTO events (id, aggregate_type, aggregate_id, event_type, version, payload, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
				['evt-2', 'Page', 'sort-test', 'PageUpdated', 2, JSON.stringify({ title: 'Second' })],
			);

			db.run(
				`INSERT INTO events (id, aggregate_type, aggregate_id, event_type, version, payload, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
				['evt-1', 'Page', 'sort-test', 'PageCreated', 1, JSON.stringify({ title: 'First' })],
			);

			type PageState = { title: string };

			const { state, version } = rehydrateAggregate<PageState>(
				db,
				'Page',
				'sort-test',
				{ title: '' },
				(state, event) => ({ ...state, ...(event.payload as any) }),
			);

			// If ORDER BY version ASC works, "Second" wins (applied last)
			// If not, "First" would win (inserted last, processed last)
			expect(version).toBe(2);
			expect(state.title).toBe('Second');
		});
	});
});
