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
                <a :href="'https://' + service.latestDeployment.staticUrl" target="_blank">{{
                    service.latestDeployment.staticUrl }}</a>
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
            <div v-if="service.instance.numReplicas > 1" class="field">
                <label>Replicas</label>
                <span>{{ service.instance.numReplicas }}</span>
            </div>
        </template>
        <div class="card-actions">
            <button v-if="canDeploy && !polling" class="deploy-btn" :disabled="deploying" @click="bringUp">{{ deploying
                ?
                "Deploying..." : "Bring up" }}</button>
            <span v-if="polling" class="status status-pending">deploying...</span>
            <button v-if="service.latestDeployment && !polling" class="takedown-btn"
                :disabled="removing || service.latestDeployment?.status !== 'SUCCESS'" @click="takeDown">{{ removing ?
                    "Undeploying..." : "Take down" }}</button>
        </div>
    </InfoCard>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { api } from "../api";
import type { RailwayService, ServiceStatus } from "../types";
// biome-ignore lint/correctness/noUnusedImports: template ref
import InfoCard from "./InfoCard.vue";

const props = defineProps<{
  service: RailwayService;
  projectId: string;
  environmentId: string;
}>();

const emit = defineEmits<{
  removed: [patch: ServiceStatus];
  deployed: [patch: ServiceStatus];
}>();

const removing = ref(false);
const deploying = ref(false);
const polling = ref(false);
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const TERMINAL_STATUSES = new Set(["SUCCESS", "REMOVED", "FAILED", "CRASHED"]);
const INACTIVE_STATUSES = new Set(["REMOVED", "FAILED", "CRASHED"]);

// biome-ignore lint/correctness/noUnusedVariables: template ref
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
  try {
    const data = await api.getServiceStatus(
      props.projectId,
      props.service.id,
      props.environmentId,
    );
    const status = data.latestDeployment?.status;
    if (status && TERMINAL_STATUSES.has(status)) {
      stopPolling();
      emit("deployed", data);
    } else {
      pollTimer = setTimeout(pollStatus, 5000);
    }
  } catch {
    stopPolling();
  }
}

// biome-ignore lint/correctness/noUnusedVariables: template ref
async function bringUp() {
  deploying.value = true;
  try {
    await api.deployService(
      props.projectId,
      props.service.id,
      props.environmentId,
    );
    polling.value = true;
    pollTimer = setTimeout(pollStatus, 3000);
  } catch {
    // deploy failed — button re-enables
  } finally {
    deploying.value = false;
  }
}

onUnmounted(stopPolling);

// biome-ignore lint/correctness/noUnusedVariables: template ref
async function takeDown() {
  if (!props.service.latestDeployment) return;
  removing.value = true;
  try {
    await api.removeDeployment(
      props.projectId,
      props.service.latestDeployment.id,
    );
    const data = await api.getServiceStatus(
      props.projectId,
      props.service.id,
      props.environmentId,
    );
    emit("removed", data);
  } catch {
    // removal failed — button re-enables
  } finally {
    removing.value = false;
  }
}

// biome-ignore lint/correctness/noUnusedVariables: template ref
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

// biome-ignore lint/correctness/noUnusedVariables: template ref
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
