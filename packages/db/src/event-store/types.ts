export type NewEvent = {
	id: string;
	harborId?: string;
	aggregateType: string;
	aggregateId: string;
	eventType: string;
	version: number;
	payload: unknown;
	metadata?: unknown;
};

export type StoredEvent = Readonly<{
	sequence: number;
	id: string;
	harborId: string | null;
	aggregateType: string;
	aggregateId: string;
	eventType: string;
	version: number;
	payload: unknown;
	metadata: unknown | null;
	createdAt: string;
}>;

// Type for DB Result cause of snakecase
export type EventRow = {
	sequence: number;
	id: string;
	harbor_id: string | null;
	aggregate_type: string;
	aggregate_id: string;
	event_type: string;
	version: number;
	payload: string;
	metadata: string | null;
	created_at: string;
};

// Type for DB Result cause of snakecase
export type SnapshotRow = {
	aggregate_type: string;
	aggregate_id: string;
	version: number;
	state: string;
	created_at: string;
};

export type Snapshot = Readonly<{
	aggregateType: string;
	aggregateId: string;
	version: number;
	state: unknown;
	createdAt: string;
}>;
