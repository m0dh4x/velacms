<script setup lang="ts">
import { useSession } from '@vela/auth/client';
import { VCard, VAvatar, VButton } from '@/components/ui/index';

const session = useSession();
</script>

<template>
	<div class="dashboard">
		<header class="dashboard-header">
			<h1 class="dashboard-title">Dashboard</h1>
			<div v-if="session.data?.user" class="user-info">
				<VAvatar :alt="session.data.user.email" size="md" />
				<span class="user-email">{{ session.data.user.email }}</span>
			</div>
		</header>

		<main class="dashboard-content">
			<VCard variant="default" padding="lg">
				<h2 class="card-title">Welcome to Vela CMS</h2>
				<p class="card-description">
					Your content management dashboard. Start by creating your first harbor.
				</p>
				<VButton variant="primary" class="card-action"> Create Harbor </VButton>
			</VCard>

			<div class="stats-grid">
				<VCard variant="bordered" padding="md">
					<span class="stat-label">Harbors</span>
					<span class="stat-value">0</span>
				</VCard>
				<VCard variant="bordered" padding="md">
					<span class="stat-label">Content Items</span>
					<span class="stat-value">0</span>
				</VCard>
				<VCard variant="bordered" padding="md">
					<span class="stat-label">API Calls</span>
					<span class="stat-value">0</span>
				</VCard>
			</div>
		</main>
	</div>
</template>

<style scoped>
.dashboard {
	min-height: 100vh;
	background-color: var(--color-bg-subtle);
}

.dashboard-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--space-4) var(--space-6);
	background-color: var(--color-bg);
	border-bottom: 1px solid var(--color-border);
}

.dashboard-title {
	font-size: var(--text-xl);
	font-weight: 600;
	color: var(--color-text);
}

.user-info {
	display: flex;
	align-items: center;
	gap: var(--space-3);
}

.user-email {
	font-size: var(--text-sm);
	color: var(--color-text-muted);
}

.dashboard-content {
	padding: var(--space-6);
	max-width: 1200px;
	margin: 0 auto;
}

.card-title {
	font-size: var(--text-lg);
	font-weight: 600;
	color: var(--color-text);
	margin-bottom: var(--space-2);
}

.card-description {
	font-size: var(--text-sm);
	color: var(--color-text-muted);
	margin-bottom: var(--space-4);
}

.card-action {
	margin-top: var(--space-2);
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: var(--space-4);
	margin-top: var(--space-6);
}

.stat-label {
	display: block;
	font-size: var(--text-sm);
	color: var(--color-text-muted);
	margin-bottom: var(--space-1);
}

.stat-value {
	display: block;
	font-size: var(--text-2xl);
	font-weight: 700;
	color: var(--color-text);
}
</style>
