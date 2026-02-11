<template>
  <InfoCard :title="service.name" :icon="service.icon">
    <template v-if="service.latestDeployment">
      <div class="field">
        <label>Status</label>
        <span :class="['status', statusClass(service.latestDeployment.status)]">
          {{ service.latestDeployment.status }}
        </span>
      </div>
      <div class="field">
        <label>Deployed</label>
        <span>{{ formatDate(service.latestDeployment.createdAt) }}</span>
      </div>
      <div v-if="service.latestDeployment.staticUrl" class="field">
        <label>URL</label>
        <a
          :href="'https://' + service.latestDeployment.staticUrl"
          target="_blank"
        >{{ service.latestDeployment.staticUrl }}</a>
      </div>
      <div v-if="service.latestDeployment.repo" class="field">
        <label>Repo</label>
        <span>{{ service.latestDeployment.repo }}</span>
      </div>
      <div v-if="service.latestDeployment.image" class="field">
        <label>Image</label>
        <span>{{ service.latestDeployment.image }}</span>
      </div>
    </template>
    <div v-else class="field">
      <span class="status status-none">No deployments</span>
    </div>
    <template v-if="service.instance">
      <div v-if="service.instance.region" class="field">
        <label>Region</label>
        <span>{{ service.instance.region }}</span>
      </div>
      <div class="field">
        <label>Restart Policy</label>
        <span>{{ service.instance.restartPolicyType }}</span>
      </div>
      <div v-if="service.instance.numReplicas > 1" class="field">
        <label>Replicas</label>
        <span>{{ service.instance.numReplicas }}</span>
      </div>
    </template>
    <div class="card-actions">
      <button
        v-if="canDeploy && !polling"
        class="deploy-btn"
        :disabled="deploying"
        @click="bringUp"
      >{{ deploying ? "Deploying..." : "Bring up" }}</button>
      <span v-if="polling" class="status status-pending">deploying...</span>
      <button
        v-if="service.latestDeployment && !polling"
        class="takedown-btn"
        :disabled="removing || service.latestDeployment?.status !== 'SUCCESS'"
        @click="takeDown"
      >{{ removing ? "Removing..." : "Take down" }}</button>
    </div>
  </InfoCard>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
// biome-ignore lint/correctness/noUnusedImports: used in template
import InfoCard from "./InfoCard.vue";

interface Deployment {
  id: string;
  status: string;
  createdAt: string;
  staticUrl: string | null;
  image: string | null;
  repo: string | null;
}

interface ServiceInstance {
  region: string | null;
  numReplicas: number;
  restartPolicyType: string;
  restartPolicyMaxRetries: number;
  startCommand: string | null;
  healthcheckPath: string | null;
}

export interface RailwayService {
  id: string;
  name: string;
  icon: string | null;
  createdAt: string;
  latestDeployment: Deployment | null;
  instance: ServiceInstance | null;
}

const props = defineProps<{
  service: RailwayService;
  projectId: string;
  environmentId: string;
  token: string;
}>();

const emit = defineEmits<{
  removed: [];
  deployed: [];
}>();

const removing = ref(false);
const deploying = ref(false);
const polling = ref(false);
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const TERMINAL_STATUSES = new Set(["SUCCESS", "REMOVED", "FAILED", "CRASHED"]);
const INACTIVE_STATUSES = new Set(["REMOVED", "FAILED", "CRASHED"]);

// biome-ignore lint/correctness/noUnusedVariables: used in template
const canDeploy = computed(() => {
  const dep = props.service.latestDeployment;
  return !dep || INACTIVE_STATUSES.has(dep.status);
});

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  polling.value = false;
}

async function pollStatus() {
  polling.value = true;
  const res = await fetch(
    `/api/projects/${props.projectId}/services/${props.service.id}?environmentId=${props.environmentId}`,
    { headers: { Authorization: `Bearer ${props.token}` } },
  );
  if (!res.ok) {
    stopPolling();
    return;
  }
  const data = await res.json();
  const status = data.latestDeployment?.status;
  if (status && TERMINAL_STATUSES.has(status)) {
    stopPolling();
    emit("deployed");
  } else {
    pollTimer = setTimeout(pollStatus, 5000);
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function bringUp() {
  deploying.value = true;
  const res = await fetch(
    `/api/projects/${props.projectId}/services/${props.service.id}/deploy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${props.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ environmentId: props.environmentId }),
    },
  );
  deploying.value = false;
  if (res.ok) {
    pollTimer = setTimeout(pollStatus, 3000);
  }
}

onUnmounted(stopPolling);

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function takeDown() {
  if (!props.service.latestDeployment) return;
  removing.value = true;
  const res = await fetch(
    `/api/projects/${props.projectId}/deployments/${props.service.latestDeployment.id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${props.token}` },
    },
  );
  removing.value = false;
  if (res.ok) {
    emit("removed");
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function statusClass(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "status-success";
    case "FAILED":
    case "CRASHED":
      return "status-error";
    case "BUILDING":
    case "DEPLOYING":
    case "QUEUED":
    case "WAITING":
      return "status-pending";
    default:
      return "status-none";
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
</script>

<style scoped>
.status {
  font-weight: 600;
  text-transform: lowercase;
  font-size: 0.8rem;
}

.status-success {
  color: #4ade80;
}

.status-error {
  color: #f87171;
}

.status-pending {
  color: #facc15;
}

.status-none {
  color: #666;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.field label {
  font-size: 0.65rem;
  font-variant: small-caps;
  letter-spacing: 0.05em;
  color: #777;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.card-actions button {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.card-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.deploy-btn {
  background: #166534;
}

.deploy-btn:hover:not(:disabled) {
  background: #15803d;
}

.takedown-btn {
  background: #991b1b;
}

.takedown-btn:hover:not(:disabled) {
  background: #b91c1c;
}
</style>
