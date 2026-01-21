import { createAuthClient } from 'better-auth/vue';

export const authClient = createAuthClient({
	baseURL: 'http://localhost:3000',
});

export const { signIn, signOut, signUp, useSession } = authClient;

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
