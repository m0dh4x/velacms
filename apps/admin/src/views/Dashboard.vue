<script setup lang="ts">
import { useSession } from '@vela/auth/client';

const session = useSession();
</script>

<template>
	<div class="dashboard">
		<h1>Welcome to the Dashboard</h1>
		<pre>{{ session }}</pre>
		<p v-if="session.data?.user">Welcome, {{ session.data.user.email }}</p>
	</div>
</template>
