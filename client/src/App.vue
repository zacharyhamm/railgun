<template>
  <div>
    <h1>Railgun</h1>
    <template v-if="authenticated">
      <button @click="logout">Logout</button>

      <template v-if="selectedProject">
        <h2>
          <a href="#" @click.prevent="selectedProject = null">&larr; Projects</a>
          / {{ selectedProject.name }}
        </h2>
        <p v-if="loadingServices">Loading...</p>
        <template v-else>
          <div class="section-header">
            <h3>Services</h3>
            <button class="create-btn" @click="showCreateModal = true">Create service</button>
          </div>
          <CreateServiceModal
            v-model="showCreateModal"
            :project-id="selectedProject!.id"
            :token="getToken()!"
            @created="selectProject(selectedProject!)"
          />
          <div v-if="services.length" class="card-grid">
            <RailwayServiceCard
              v-for="s in services"
              :key="s.id"
              :service="s"
              :project-id="selectedProject!.id"
              :environment-id="environments[0]?.id ?? ''"
              :token="getToken()!"
              @removed="selectProject(selectedProject!)"
              @deployed="selectProject(selectedProject!)"
            />
          </div>
          <p v-else>No services found.</p>
        </template>
      </template>

      <template v-else>
        <h2>Projects</h2>
        <p v-if="loadingProjects">Loading...</p>
        <ul v-else-if="projects.length">
          <li v-for="p in projects" :key="p.id">
            <a href="#" @click.prevent="selectProject(p)">{{ p.name }}</a>
            <span v-if="p.description"> &mdash; {{ p.description }}</span>
          </li>
        </ul>
        <p v-else>No projects found.</p>
      </template>
    </template>
    <template v-else>
      <a href="/oauth/authorize">
        <button>Login with Railway</button>
      </a>
    </template>
    <ModalsContainer />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
// biome-ignore lint/correctness/noUnusedImports: used in template
import { ModalsContainer } from "vue-final-modal";
// biome-ignore lint/correctness/noUnusedImports: used in template
import CreateServiceModal from "./components/CreateServiceModal.vue";
import type { RailwayService } from "./components/RailwayServiceCard.vue";
// biome-ignore lint/correctness/noUnusedImports: used in template
import RailwayServiceCard from "./components/RailwayServiceCard.vue";

interface Project {
  id: string;
  name: string;
  description: string;
}

interface Environment {
  id: string;
  name: string;
}

const authenticated = ref(false);
const projects = ref<Project[]>([]);
const loadingProjects = ref(false);
const selectedProject = ref<Project | null>(null);
const services = ref<RailwayService[]>([]);
const environments = ref<Environment[]>([]);
const loadingServices = ref(false);
// biome-ignore lint/correctness/noUnusedVariables: used in template
const showCreateModal = ref(false);

function getToken(): string | null {
  return localStorage.getItem("token");
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function fetchProjects() {
  loadingProjects.value = true;
  const res = await fetch("/api/projects", { headers: authHeaders() });
  if (res.ok) {
    projects.value = await res.json();
  }
  loadingProjects.value = false;
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function selectProject(project: Project) {
  selectedProject.value = project;
  services.value = [];
  environments.value = [];
  loadingServices.value = true;
  const res = await fetch(`/api/projects/${project.id}/services`, {
    headers: authHeaders(),
  });
  if (res.ok) {
    const data = await res.json();
    services.value = data.services;
    environments.value = data.environments;
  }
  loadingServices.value = false;
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function logout() {
  const token = getToken();
  if (token) {
    await fetch("/oauth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  clearToken();
  authenticated.value = false;
}

onMounted(async () => {
  // Check for token in URL (redirect from OAuth callback)
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    setToken(urlToken);
    history.replaceState({}, "", window.location.pathname);
  }

  const token = getToken();
  if (!token) return;

  const res = await fetch("/api/health", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    authenticated.value = true;
    fetchProjects();
  } else {
    clearToken();
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
</style>
