import { db } from '@vela/db';
import { nanoid } from 'nanoid';

const DEFAULT_PERMISSIONS = {
	admin: JSON.stringify({
		content: { create: true, read: true, update: true, delete: true, publish: true },
		assets: { create: true, read: true, update: true, delete: true },
		blueprints: { manage: true },
		users: { manage: true },
		settings: { manage: true },
	}),
	editor: JSON.stringify({
		content: { create: true, read: true, update: true, delete: false, publish: false },
		assets: { create: true, read: true, update: true, delete: false },
		blueprints: { manage: false },
		users: { manage: false },
		settings: { manage: false },
	}),
	viewer: JSON.stringify({
		content: { create: false, read: true, update: false, delete: false, publish: false },
		assets: { create: false, read: true, update: false, delete: false },
		blueprints: { manage: false },
		users: { manage: false },
		settings: { manage: false },
	}),
};

export const setupHarborDefaults = (harborId: string, userId: string) => {
	// insert default roles
	const adminRoleId = `rol_${nanoid(16)}`;
	const editorRoleId = `rol_${nanoid(16)}`;
	const viewerRoleId = `rol_${nanoid(16)}`;

	const insertRole = db.prepare(
		`INSERT INTO harbor_roles (id, harbor_id, name, slug, description, permissions, is_system)
		 VALUES (?, ?, ?, ?, ?, ?, 1)`,
	);

	insertRole.run(
		adminRoleId,
		harborId,
		'Admin',
		'admin',
		'Full control over harbor settings, users, and content',
		DEFAULT_PERMISSIONS.admin,
	);

	insertRole.run(
		editorRoleId,
		harborId,
		'Editor',
		'editor',
		'Can create, edit, and update content',
		DEFAULT_PERMISSIONS.editor,
	);
	insertRole.run(
		viewerRoleId,
		harborId,
		'Viewer',
		'viewer',
		'Read-only access to content',
		DEFAULT_PERMISSIONS.viewer,
	);

	// Add creator as admin member
	db.prepare(
		`INSERT INTO harbor_members (id, user_id, harbor_id, role_id, permissions)
		 VALUES (?, ?, ?, ?, '{}')`,
	).run(`mem_${nanoid(16)}`, userId, harborId, adminRoleId);

	// Default locale (English)
	db.prepare(
		`INSERT INTO harbor_locales (id, harbor_id, code, name, is_default)
		 VALUES (?, ?, 'en', 'English', 1)`,
	).run(`loc_${nanoid(16)}`, harborId);

	// Default workflow (draft -> published)
	const states = JSON.stringify([
		{ name: 'draft', color: '#6b7280' },
		{ name: 'published', color: '#10b981' },
	]);
	const transitions = JSON.stringify([
		{ from: 'draft', to: 'published' },
		{ from: 'published', to: 'draft' },
	]);

	db.prepare(
		`INSERT INTO workflows (id, harbor_id, name, description, states, transitions, initial_state, is_default)
		 VALUES (?, ?, 'Default', 'Simple draft to published workflow', ?, ?, 'draft', 1)`,
	).run(`wkf_${nanoid(16)}`, harborId, states, transitions);
};
