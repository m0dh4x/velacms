const BASE_URL = 'http://localhost:3000';

export type ApiError = {
	status: number;
	message: string;
};

function createApiError(status: number, message: string): ApiError {
	return { status, message };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${BASE_URL}${path}`, {
		...options,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw createApiError(response.status, body.message ?? response.statusText);
	}

	if (response.status === 204) return undefined as T;

	const data = await response.json();
	return data as T;
}

export const api = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, body: unknown) =>
		request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
	put: <T>(path: string, body: unknown) =>
		request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
	del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function isApiError(error: unknown): error is ApiError {
	return typeof error === 'object' && error !== null && 'status' in error && 'message' in error;
}
