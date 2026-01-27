<script setup lang="ts">
import { computed } from 'vue';
import { Primitive, type PrimitiveProps } from 'reka-ui';

interface Props extends PrimitiveProps {
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
	size?: 'sm' | 'md' | 'lg';
	loading?: boolean;
	disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	as: 'button',
	variant: 'primary',
	size: 'md',
});

const classes = computed(() => [
	'v-button',
	`v-button--${props.variant}`,
	`v-button--${props.size}`,
	{ 'v-button--loading': props.loading },
]);
</script>

<template>
	<Primitive :as="as" :as-child="asChild" :class="classes" :disabled="disabled || loading">
		<span v-if="loading" class="v-button__spinner" />
		<span class="v-button__content" :class="{ 'v-button__content--hidden': loading }">
			<slot />
		</span>
	</Primitive>
</template>

<style scoped>
.v-button {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
	font-weight: 500;
	border-radius: var(--radius-md);
	transition:
		background-color var(--transition-fast),
		transform var(--transition-fast),
		box-shadow var(--transition-fast);
}

.v-button:active:not(:disabled) {
	transform: scale(0.98);
}

.v-button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

/* Sizes */
.v-button--sm {
	height: 2rem;
	padding: 0 var(--space-3);
	font-size: var(--text-sm);
}

.v-button--md {
	height: 2.5rem;
	padding: 0 var(--space-4);
	font-size: var(--text-sm);
}

.v-button--lg {
	height: 3rem;
	padding: 0 var(--space-6);
	font-size: var(--text-base);
}

/* Variants */
.v-button--primary {
	background-color: var(--color-primary);
	color: white;
}

.v-button--primary:hover:not(:disabled) {
	background-color: var(--color-primary-hover);
	box-shadow: 0 4px 12px rgba(2, 112, 166, 0.3);
}

.v-button--secondary {
	background-color: var(--color-bg-muted);
	color: var(--color-text);
	border: 1px solid var(--color-border);
}

.v-button--secondary:hover:not(:disabled) {
	background-color: var(--color-border);
	border-color: var(--color-border-strong);
}

.v-button--ghost {
	background-color: transparent;
	color: var(--color-text);
}

.v-button--ghost:hover:not(:disabled) {
	background-color: var(--color-bg-muted);
}

.v-button--danger {
	background-color: var(--color-error);
	color: white;
}

.v-button--danger:hover:not(:disabled) {
	background-color: #b91c1c;
	box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

/* Loading state */
.v-button__content {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
	transition: opacity var(--transition-fast);
}

.v-button__content--hidden {
	opacity: 0;
}

.v-button__spinner {
	position: absolute;
	width: 1rem;
	height: 1rem;
	border: 2px solid currentColor;
	border-top-color: transparent;
	border-radius: 50%;
	animation: spin 0.6s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
