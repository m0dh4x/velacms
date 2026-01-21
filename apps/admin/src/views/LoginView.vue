<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
console.log('test');

async function handleSubmit(event: Event) {
	console.log('handleSubmit', event);
	console.log({ email, password });
	if (!email.value || !password.value) {
		console.log('Email and password are required');
		error.value = 'Email and password are required';
		return;
	}

	console.log({ email: email.value, password: password.value });

	try {
		console.log('before fetching');
		const response = await fetch('http://localhost:3000/api/auth/sign-in/email', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ email: email.value, password: password.value }),
			credentials: 'include',
		});

		if (!response.ok) {
			error.value = 'Login failed';
			throw new Error('Login failed');
		}
		const data = await response.json();
		console.log({ data });

		router.push('/');
	} catch (error) {
		console.error(error);
	}
}
</script>

<template>
	<div>
		<h1>Login</h1>
	</div>
	<div>
		<form @submit.prevent="handleSubmit">
			<label for="email">E-Mail:</label>
			<input type="text" v-model="email" id="email" name="email" required />
			<label for="password">Password:</label>
			<input type="password" v-model="password" id="password" name="password" required />
			<button type="submit">Login</button>
		</form>
	</div>
</template>
