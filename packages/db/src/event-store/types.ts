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

export type StoredEvent = {
	sequence: number;
	id: string;
	harborId: string | null;
	aggregateType: string;
	aggregateId: string;
	eventType: string;
	version: number;
	payload: unknown;
	metadata?: unknown | null;
	createdAt: string;
};

export type Snapshot = {
	aggregateType: string;
	aggregateId: string;
	version: number;
	state: unknown;
	createdAt: string;
};
