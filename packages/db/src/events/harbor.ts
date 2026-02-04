import type { StoredEvent } from '../event-store';

export type HarborState = {
	id: string;
	name: string;
	slug: string;
	settings: Record<string, unknown>;
	organizationId: string | null;
	createdBy: string;
	deleted: boolean;
};

export type HarborCreatedPayload = {
	id: string;
	name: string;
	slug: string;
	settings: Record<string, unknown>;
	organizationId: string | null;
	createdBy: string;
};

export type HarborUpdatedPayload = {
	name?: string;
	settings?: Record<string, unknown>;
};

export const applyHarborEvent = (state: HarborState, event: StoredEvent): HarborState => {
	switch (event.eventType) {
		case 'HarborCreated': {
			const payload = event.payload as HarborCreatedPayload;
			return { ...state, ...payload, deleted: false };
		}
		case 'HarborUpdated': {
			const payload = event.payload as HarborUpdatedPayload;
			return {
				...state,
				...(payload.name && { name: payload.name }),
				...(payload.settings && { settings: payload.settings }),
			};
		}
		case 'HarborDeleted': {
			return { ...state, deleted: true };
		}
		default:
			return state;
	}
};
