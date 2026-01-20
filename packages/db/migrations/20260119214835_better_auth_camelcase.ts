import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	// Recreate session table with camelCase columns
	db.run(`
		CREATE TABLE session_new (
			id TEXT PRIMARY KEY,
			userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			token TEXT NOT NULL UNIQUE,
			expiresAt TEXT NOT NULL,
			ipAddress TEXT,
			userAgent TEXT,
			createdAt TEXT NOT NULL DEFAULT (datetime('now')),
			updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);
	db.run(`
		INSERT INTO session_new (id, userId, token, expiresAt, ipAddress, userAgent, createdAt, updatedAt)
		SELECT id, user_id, token, expires_at, ip_address, user_agent, created_at, updated_at FROM session
	`);
	db.run(`DROP TABLE session`);
	db.run(`ALTER TABLE session_new RENAME TO session`);

	// Recreate account table with camelCase columns
	db.run(`
		CREATE TABLE account_new (
			id TEXT PRIMARY KEY,
			userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			accountId TEXT NOT NULL,
			providerId TEXT NOT NULL,
			accessToken TEXT,
			refreshToken TEXT,
			accessTokenExpiresAt TEXT,
			refreshTokenExpiresAt TEXT,
			scope TEXT,
			idToken TEXT,
			password TEXT,
			createdAt TEXT NOT NULL DEFAULT (datetime('now')),
			updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);
	db.run(`
		INSERT INTO account_new (id, userId, accountId, providerId, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, idToken, password, createdAt, updatedAt)
		SELECT id, user_id, account_id, provider_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, scope, id_token, password, created_at, updated_at FROM account
	`);
	db.run(`DROP TABLE account`);
	db.run(`ALTER TABLE account_new RENAME TO account`);

	// Recreate verification table with camelCase columns
	db.run(`
		CREATE TABLE verification_new (
			id TEXT PRIMARY KEY,
			identifier TEXT NOT NULL,
			value TEXT NOT NULL,
			expiresAt TEXT NOT NULL,
			createdAt TEXT NOT NULL DEFAULT (datetime('now')),
			updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);
	db.run(`
		INSERT INTO verification_new (id, identifier, value, expiresAt, createdAt, updatedAt)
		SELECT id, identifier, value, expires_at, created_at, updated_at FROM verification
	`);
	db.run(`DROP TABLE verification`);
	db.run(`ALTER TABLE verification_new RENAME TO verification`);

	// Recreate user table with camelCase columns
	db.run(`
		CREATE TABLE user_new (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			emailVerified INTEGER NOT NULL DEFAULT 0,
			image TEXT,
			createdAt TEXT NOT NULL DEFAULT (datetime('now')),
			updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);
	db.run(`
		INSERT INTO user_new (id, name, email, emailVerified, image, createdAt, updatedAt)
		SELECT id, name, email, email_verified, image, created_at, updated_at FROM user
	`);
	db.run(`DROP TABLE user`);
	db.run(`ALTER TABLE user_new RENAME TO user`);
};

export const down = (db: Database) => {
	// Recreate user table with snake_case columns
	db.run(`
		CREATE TABLE user_new (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			email_verified INTEGER NOT NULL DEFAULT 0,
			image TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);
	db.run(`
		INSERT INTO user_new (id, name, email, email_verified, image, created_at, updated_at)
		SELECT id, name, email, emailVerified, image, createdAt, updatedAt FROM user
	`);
	db.run(`DROP TABLE user`);
	db.run(`ALTER TABLE user_new RENAME TO user`);

	// Recreate session table with snake_case columns
	db.run(`
		CREATE TABLE session_new (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			token TEXT NOT NULL UNIQUE,
			expires_at TEXT NOT NULL,
			ip_address TEXT,
			user_agent TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);
	db.run(`
		INSERT INTO session_new (id, user_id, token, expires_at, ip_address, user_agent, created_at, updated_at)
		SELECT id, userId, token, expiresAt, ipAddress, userAgent, createdAt, updatedAt FROM session
	`);
	db.run(`DROP TABLE session`);
	db.run(`ALTER TABLE session_new RENAME TO session`);

	// Recreate account table with snake_case columns
	db.run(`
		CREATE TABLE account_new (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			account_id TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			access_token TEXT,
			refresh_token TEXT,
			access_token_expires_at TEXT,
			refresh_token_expires_at TEXT,
			scope TEXT,
			id_token TEXT,
			password TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);
	db.run(`
		INSERT INTO account_new (id, user_id, account_id, provider_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, scope, id_token, password, created_at, updated_at)
		SELECT id, userId, accountId, providerId, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, idToken, password, createdAt, updatedAt FROM account
	`);
	db.run(`DROP TABLE account`);
	db.run(`ALTER TABLE account_new RENAME TO account`);

	// Recreate verification table with snake_case columns
	db.run(`
		CREATE TABLE verification_new (
			id TEXT PRIMARY KEY,
			identifier TEXT NOT NULL,
			value TEXT NOT NULL,
			expires_at TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);
	db.run(`
		INSERT INTO verification_new (id, identifier, value, expires_at, created_at, updated_at)
		SELECT id, identifier, value, expiresAt, createdAt, updatedAt FROM verification
	`);
	db.run(`DROP TABLE verification`);
	db.run(`ALTER TABLE verification_new RENAME TO verification`);
};
