import { api } from './client';
import { HarborSchema, harborListSchema, type Harbor } from './schemas/harbor';

export const fetchHarbors = async (): Promise<Harbor[]> => {
	const data = await api.get('/api/v1/harbors');
	return harborListSchema.parse(data);
};

export const fetchHarbor = async (id: string): Promise<Harbor> => {
	const data = await api.get(`/api/v1/harbors/${id}`);
	return HarborSchema.parse(data);
};

export const createHarbor = async (input: { name: string; slug: string }): Promise<Harbor> => {
	const data = await api.post('/api/v1/harbors', input);
	return HarborSchema.parse(data);
};

export const updateHarbor = async (
	id: string,
	input: { name?: string; settings?: Record<string, unknown> },
): Promise<Harbor> => {
	const data = await api.put(`/api/v1/harbors/${id}`, input);
	return HarborSchema.parse(data);
};

export const deleteHarbor = async (id: string): Promise<void> => {
	await api.del(`/api/v1/harbors/${id}`);
};
