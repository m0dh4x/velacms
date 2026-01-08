<script setup lang="ts">
import { useSession } from "@vela/auth/client";

const { data: session } = useSession();
</script>

<template>
  <div>
    <h1>Vela CMS Admin</h1>
    <p v-if="session">Welcome, {{ session.user.email }}</p>
    <p v-else>Please sign in</p>
  </div>
</template>
