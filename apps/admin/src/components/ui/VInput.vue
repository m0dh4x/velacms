<script setup lang="ts">
import { computed } from 'vue';

interface Props {
	modelValue?: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	error?: boolean;
	id?: string;
	name?: string;
	required?: boolean;
	autocomplete?: string;
}

const props = withDefaults(defineProps<Props>(), {
	type: 'text',
	modelValue: '',
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const classes = computed(() => [
	'v-input',
	{ 'v-input--error': props.error },
	{ 'v-input--disabled': props.disabled },
]);

const handleInput = (event: Event) => {
	const target = event.target as HTMLInputElement;
	emit('update:modelValue', target.value);
};
</script>

<template>
	<input
		:type="type"
		:value="modelValue"
		:placeholder="placeholder"
		:disabled="disabled"
		:id="id"
		:name="name"
		:required="required"
		:autocomplete="autocomplete"
		:class="classes"
		@input="handleInput"
	/>
</template>

<style scoped>
.v-input {
	width: 100%;
	height: 2.5rem;
	padding: 0 var(--space-3);
	background-color: var(--color-bg);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	font-size: var(--text-sm);
	transition:
		border-color var(--transition-fast),
		box-shadow var(--transition-fast),
		background-color var(--transition-fast);
}

.v-input::placeholder {
	color: var(--color-text-subtle);
}

.v-input:hover:not(:disabled) {
	border-color: var(--color-border-strong);
}

.v-input:focus {
	border-color: var(--color-primary);
	box-shadow: 0 0 0 3px var(--color-primary-subtle);
	outline: none;
}

.v-input--error {
	border-color: var(--color-error);
}

.v-input--error:focus {
	box-shadow: 0 0 0 3px var(--color-error-subtle);
}

.v-input--disabled {
	opacity: 0.6;
	cursor: not-allowed;
	background-color: var(--color-bg-muted);
}
</style>
