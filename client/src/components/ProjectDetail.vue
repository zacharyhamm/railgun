<template>
  <div>
    <h2>
      <router-link to="/">&larr; Projects</router-link>
      <template v-if="projectName"> / {{ projectName }}</template>
    </h2>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else>
      <div class="section-header">
        <h3>Services</h3>
        <button class="create-btn" @click="showCreateModal = true">Create service</button>
      </div>
      <CreateServiceModal
        v-model="showCreateModal"
        :project-id="projectId"
        :environment-id="environments[0]?.id"
        @created="fetchServices"
      />
      <div v-if="services.length" class="card-grid">
        <RailwayServiceCard
          v-for="s in services"
          :key="s.id"
          :service="s"
          :project-id="projectId"
          :environment-id="environments[0]?.id ?? ''"
          @removed="updateService(s.id, $event)"
          @deployed="updateService(s.id, $event)"
        />
      </div>
      <p v-else>No services found.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api";
import type { Environment, RailwayService } from "../types";
// biome-ignore lint/correctness/noUnusedImports: template refs
import CreateServiceModal from "./CreateServiceModal.vue";
// biome-ignore lint/correctness/noUnusedImports: template refs
import RailwayServiceCard from "./RailwayServiceCard.vue";

const route = useRoute();
const projectId = route.params.projectId as string;

const projectName = ref("");
const services = ref<RailwayService[]>([]);
const environments = ref<Environment[]>([]);
const loading = ref(true);
const error = ref("");
// biome-ignore lint/correctness/noUnusedVariables: template ref
const showCreateModal = ref(false);

async function fetchServices() {
  try {
    const data = await api.getProjectServices(projectId);
    projectName.value = data.name;
    services.value = data.services;
    environments.value = data.environments;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to load services";
  } finally {
    loading.value = false;
  }
}

// biome-ignore lint/correctness/noUnusedVariables: template ref
function updateService(
  serviceId: string,
  patch: {
    instance: RailwayService["instance"];
    latestDeployment: RailwayService["latestDeployment"];
  },
) {
  const idx = services.value.findIndex((s) => s.id === serviceId);
  if (idx !== -1) {
    services.value[idx] = { ...services.value[idx], ...patch };
  }
}

onMounted(fetchServices);
</script>

<style scoped>
a {
  text-decoration: underline;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;
  padding-left: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-header h3 {
  margin: 0;
}

.create-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: #166534;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.create-btn:hover {
  background: #15803d;
}

.error {
  color: #f87171;
}
</style>
