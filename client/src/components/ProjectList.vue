<template>
  <div>
    <h2>Projects</h2>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <ul v-else-if="projects.length">
      <li v-for="p in projects" :key="p.id">
        <router-link :to="'/projects/' + p.id">{{ p.name }}</router-link>
        <span v-if="p.description"> &mdash; {{ p.description }}</span>
      </li>
    </ul>
    <p v-else>No projects found.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api";
import type { Project } from "../types";

const projects = ref<Project[]>([]);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    projects.value = await api.getProjects();
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to load projects";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
a {
  text-decoration: underline;
}

ul {
  padding-left: 2rem;
}

.error {
  color: #f87171;
}
</style>
