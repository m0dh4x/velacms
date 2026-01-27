import { db } from './index';
import { auth } from '@vela/auth';

export async function seed() {
	// eslint-disable-next-line no-console
	console.log('Seeding the database ...\n');

	const userExist = db
		.query<{ id: string }, [string]>('SELECT id FROM user WHERE email = ?')
		.get('admin@velacms.local');

	if (userExist) {
		// eslint-disable-next-line no-console
		console.log('Database user already exists. Skipping.\n');
		return;
	}

	if (!process.env.SEED_PASSWORD) {
		// eslint-disable-next-line no-console
		console.log('.env with SEED_PASSWORD is missing');
		return;
	}

	await auth.api.signUpEmail({
		body: {
			email: 'admin@velacms.local',
			password: process.env.SEED_PASSWORD,
			name: 'Admin user',
		},
	});
	// oxlint-disable-next-line no-console
	console.log('Created user: Admin User: admin@velacms.local');
}

await seed();
