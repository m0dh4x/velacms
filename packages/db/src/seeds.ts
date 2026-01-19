import { db } from './index';
import { nanoid } from 'nanoid';

export function seed() {
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

	db.run(
		`INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
		 VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
		[nanoid(), 'Admin User', 'admin@velacms.local', 1],
	);
	// eslint-disable-next-line no-console
	console.log('Created user: Admin User: admin@velacms.local');
}

seed();
