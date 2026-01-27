<script setup lang="ts">
interface Props {
	variant?: 'default' | 'bordered' | 'elevated';
	padding?: 'none' | 'sm' | 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
	variant: 'default',
	padding: 'md',
});
</script>

<template>
	<div :class="['v-card', `v-card--${variant}`, `v-card--padding-${padding}`]">
		<slot />
	</div>
</template>

<style scoped>
.v-card {
	background-color: var(--color-bg);
	border-radius: var(--radius-lg);
	transition: box-shadow var(--transition-normal);
}

/* Variants */
.v-card--default {
	border: 1px solid var(--color-border);
}

.v-card--bordered {
	border: 1px solid var(--color-border-strong);
}

.v-card--elevated {
	border: none;
	box-shadow: var(--shadow-md);
}

.v-card--elevated:hover {
	box-shadow: var(--shadow-lg);
}

/* Padding */
.v-card--padding-none {
	padding: 0;
}

.v-card--padding-sm {
	padding: var(--space-3);
}

.v-card--padding-md {
	padding: var(--space-6);
}

.v-card--padding-lg {
	padding: var(--space-8);
}
</style>
