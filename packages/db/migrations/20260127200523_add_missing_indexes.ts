import type { Database } from 'bun:sqlite';

export const up = (db: Database) => {
	// Auth: fast lookups for all sessions and accounts
	db.run('CREATE INDEX idx_session_user ON session(userId)');
	db.run('CREATE INDEX idx_account_user ON account(userId)');

	// for all harbor roles
	db.run('CREATE INDEX idx_harbor_roles_harbor ON harbor_roles(harbor_id)');

	// for all harbor members (user_id already covered by UNIQUE(user_id, harbor_id))
	db.run('CREATE INDEX idx_harbor_members_harbor ON harbor_members(harbor_id)');

	// for all org members (user_id already covered by UNIQUE(user_id, organization_id))
	db.run('CREATE INDEX idx_org_members_org ON organization_members(organization_id)');
};

export const down = (db: Database) => {
	db.run('DROP INDEX IF EXISTS idx_org_members_org');
	db.run('DROP INDEX IF EXISTS idx_harbor_members_harbor');
	db.run('DROP INDEX IF EXISTS idx_harbor_roles_harbor');
	db.run('DROP INDEX IF EXISTS idx_account_user');
	db.run('DROP INDEX IF EXISTS idx_session_user');
};
