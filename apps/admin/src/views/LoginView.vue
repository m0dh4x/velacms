<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { VButton, VInput, VCard, VLabel } from '@/components/ui/index';

const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

async function handleSubmit() {
	if (!email.value || !password.value) {
		error.value = 'Email and password are required';
		return;
	}

	loading.value = true;
	error.value = null;

	try {
		const response = await fetch('http://localhost:3000/api/auth/sign-in/email', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: email.value, password: password.value }),
			credentials: 'include',
		});

		if (!response.ok) {
			error.value = 'Invalid email or password';
			return;
		}

		router.push('/');
	} catch (err) {
		error.value = 'Something went wrong. Please try again.';
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<div class="login-page">
		<div class="login-container">
			<div class="login-header">
				<h1 class="login-title">Welcome back</h1>
				<p class="login-subtitle">Sign in to your account to continue</p>
			</div>

			<VCard variant="elevated" padding="lg">
				<form class="login-form" @submit.prevent="handleSubmit">
					<div v-if="error" class="login-error">
						{{ error }}
					</div>

					<div class="form-field">
						<VLabel for="email" required>Email</VLabel>
						<VInput
							id="email"
							v-model="email"
							type="email"
							placeholder="you@example.com"
							autocomplete="email"
							required
						/>
					</div>

					<div class="form-field">
						<VLabel for="password" required>Password</VLabel>
						<VInput
							id="password"
							v-model="password"
							type="password"
							placeholder="Enter your password"
							autocomplete="current-password"
							required
						/>
					</div>

					<VButton type="submit" :loading="loading" class="login-button"> Sign in </VButton>
				</form>
			</VCard>
		</div>
	</div>
</template>

<style scoped>
.login-page {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--space-4);
	background-color: var(--color-bg-subtle);
}

.login-container {
	width: 100%;
	max-width: 400px;
}

.login-header {
	text-align: center;
	margin-bottom: var(--space-8);
}

.login-title {
	font-size: var(--text-2xl);
	font-weight: 700;
	color: var(--color-text);
	margin-bottom: var(--space-2);
}

.login-subtitle {
	font-size: var(--text-sm);
	color: var(--color-text-muted);
}

.login-form {
	display: flex;
	flex-direction: column;
	gap: var(--space-5);
}

.login-error {
	padding: var(--space-3);
	background-color: var(--color-error-subtle);
	color: var(--color-error);
	border-radius: var(--radius-md);
	font-size: var(--text-sm);
	animation: shake 0.4s ease-in-out;
}

@keyframes shake {
	0%,
	100% {
		transform: translateX(0);
	}
	20%,
	60% {
		transform: translateX(-4px);
	}
	40%,
	80% {
		transform: translateX(4px);
	}
}

.form-field {
	display: flex;
	flex-direction: column;
}

.login-button {
	width: 100%;
	margin-top: var(--space-2);
}
</style>
