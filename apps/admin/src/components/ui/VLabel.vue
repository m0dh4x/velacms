<script setup lang="ts">
interface Props {
	for?: string;
	required?: boolean;
}

defineProps<Props>();
</script>

<template>
	<label :for="for" class="v-label">
		<slot />
		<span v-if="required" class="v-label__required">*</span>
	</label>
</template>

<style scoped>
.v-label {
	display: block;
	margin-bottom: var(--space-2);
	font-size: var(--text-sm);
	font-weight: 500;
	color: var(--color-text);
}

.v-label__required {
	color: var(--color-error);
	margin-left: var(--space-1);
}
</style>
