import { createRouter, createWebHistory } from 'vue-router';
import { authClient } from '@vela/auth/client';

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			component: () => import('../components/AppLayout.vue'),
			children: [
				{
					path: '',
					name: 'dashboard',
					component: () => import('../views/Dashboard.vue'),
				},
			],
		},
		{
			path: '/login',
			name: 'login',
			meta: { guest: true },
			component: () => import('../views/LoginView.vue'),
		},
	],
});

router.beforeEach(async (to) => {
	const { data: session } = await authClient.getSession();

	if (!session && !to.meta.guest) {
		return { name: 'login' };
	}

	if (session && to.meta.guest) {
		return { name: 'dashboard' };
	}
});
