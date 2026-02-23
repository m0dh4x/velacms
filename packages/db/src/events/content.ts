import type { StoredEvent } from '../event-store';

export type ContentState = {
	id: string;
	harborId: string;
	blueprintId: string;
	canonicalId: string;
	locale: string;
	slug: string;
	title: string;
	data: Record<string, unknown>;
	workflowState: string;
	isPublished: boolean;
	version: number;
	deleted: boolean;
};

export type ContentCreatedPayload = {
	id: string;
	harborId: string;
	blueprintId: string;
	canonicalId: string;
	locale: string;
	slug: string;
	title: string;
	data: Record<string, unknown>;
};
export type ContentUpdatedPayload = {
	title?: string;
	slug?: string;
	data?: Record<string, unknown>;
	workflowState?: string;
	updatedBy: string;
};
export type ContentDeletedPayload = {
	deletedBy: string;
};

export const applyContentEvent = (state: ContentState, event: StoredEvent): ContentState => {
	switch (event.eventType) {
		case 'ContentCreated': {
			const payload = event.payload as ContentCreatedPayload;
			return {
				...state,
				...payload,
				deleted: false,
			};
		}
		case 'ContentUpdated': {
			const payload = event.payload as ContentUpdatedPayload;
			return {
				...state,
				...(payload.title !== undefined && { title: payload.title }),
				...(payload.slug !== undefined && { slug: payload.slug }),
				...(payload.data !== undefined && { data: payload.data }),
				...(payload.workflowState !== undefined && { workflowState: payload.workflowState }),
			};
		}
		case 'ContentDeleted': {
			return { ...state, deleted: true };
		}
		default:
			return state;
	}
};
