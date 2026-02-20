import type { StoredEvent } from '../event-store';

export type BlueprintState = {
	id: string;
	harborId: string;
	name: string;
	slug: string;
	description: string | null;
	icon: string | null;
	type: 'fragment' | 'entity';
	schema: { fields: unknown[] };
	settings: Record<string, unknown>;
	version: number;
	deleted: boolean;
};

export type BlueprintCreatedPayload = {
	id: string;
	harborId: string;
	name: string;
	slug: string;
};

export type BlueprintUpdatedPayload = {
	name?: string;
	description?: string;
	icon?: string;
	schema?: { fields: unknown[] };
	settings?: Record<string, unknown>;
	updatedBy: string;
};

export const applyBlueprintEvent = (state: BlueprintState, event: StoredEvent): BlueprintState => {
	switch (event.eventType) {
		case 'BlueprintCreated': {
			const payload = event.payload as BlueprintCreatedPayload;
			return { ...state, ...payload, deleted: false };
		}
		case 'BlueprintUpdated': {
			const payload = event.payload as BlueprintUpdatedPayload;
			return {
				...state,
				...(payload.name && { name: payload.name }),
				...(payload.description !== undefined && { description: payload.description }),
				...(payload.icon !== undefined && { icon: payload.icon }),
				...(payload.schema && { schema: payload.schema }),
				...(payload.settings && { settings: payload.settings }),
			};
		}
		case 'BlueprintDeleted': {
			return { ...state, deleted: true };
		}
		default:
			return state;
	}
};
