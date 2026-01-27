<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
	src?: string;
	alt?: string;
	fallback?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
	size: 'md',
	alt: '',
});

const imageError = ref(false);

const showFallback = computed(() => !props.src || imageError.value);

const initials = computed(() => {
	if (props.fallback) return props.fallback.slice(0, 2).toUpperCase();
	if (props.alt) {
		return props.alt
			.split(' ')
			.map((word) => word[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}
	return '?';
});

const handleError = () => {
	imageError.value = true;
};
</script>

<template>
	<div :class="['v-avatar', `v-avatar--${size}`]">
		<img v-if="!showFallback" :src="src" :alt="alt" class="v-avatar__image" @error="handleError" />
		<span v-else class="v-avatar__fallback">{{ initials }}</span>
	</div>
</template>

<style scoped>
.v-avatar {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius-full);
	background-color: var(--color-primary-subtle);
	color: var(--color-primary);
	font-weight: 600;
	overflow: hidden;
	flex-shrink: 0;
}

/* Sizes */
.v-avatar--sm {
	width: 2rem;
	height: 2rem;
	font-size: var(--text-xs);
}

.v-avatar--md {
	width: 2.5rem;
	height: 2.5rem;
	font-size: var(--text-sm);
}

.v-avatar--lg {
	width: 3rem;
	height: 3rem;
	font-size: var(--text-base);
}

.v-avatar--xl {
	width: 4rem;
	height: 4rem;
	font-size: var(--text-lg);
}

.v-avatar__image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.v-avatar__fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}
</style>
