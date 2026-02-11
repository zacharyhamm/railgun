<template>
  <div>
    <h1>Railgun</h1>
    <p>{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

const message = ref("Loading...");

onMounted(async () => {
  const res = await fetch("/api/health");
  const data = await res.json();
  message.value = `API status: ${data.status}`;
});
</script>
