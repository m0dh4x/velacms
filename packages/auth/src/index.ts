import { db } from '@vela/db';
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
	database: db,
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: ['http://localhost:5173'],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
