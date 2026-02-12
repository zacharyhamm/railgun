<template>
    <VueFinalModal class="modal-overlay" content-class="modal-content" overlay-transition="vfm-fade"
        content-transition="vfm-fade">
        <h3>Create Service</h3>
        <form @submit.prevent="submit">
            <div class="form-field">
                <label for="svc-name">Name</label>
                <input id="svc-name" v-model="name" required />
            </div>
            <div class="form-field">
                <label for="svc-image">Docker Image</label>
                <input id="svc-image" v-model="image" placeholder="e.g. mysql" required />
            </div>
            <div class="form-actions">
                <button type="button" class="cancel-btn" @click="close">Cancel</button>
                <button type="submit" class="submit-btn" :disabled="submitting">
                    {{ submitting ? "Creating..." : "Create" }}
                </button>
            </div>
            <p v-if="error" class="error">{{ error }}</p>
        </form>
    </VueFinalModal>
</template>

<script setup lang="ts">
import { ref } from "vue";
// biome-ignore lint/correctness/noUnusedImports: template ref
import { VueFinalModal } from "vue-final-modal";
import { api } from "../api";

const props = defineProps<{
  projectId: string;
  environmentId?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  created: [];
}>();

function close() {
  emit("update:modelValue", false);
}

const name = ref("");
const image = ref("");
const submitting = ref(false);
const error = ref("");

// biome-ignore lint/correctness/noUnusedVariables: template ref
async function submit() {
  submitting.value = true;
  error.value = "";
  try {
    await api.createService(
      props.projectId,
      name.value,
      image.value,
      props.environmentId,
    );
    emit("created");
    close();
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to create service";
  } finally {
    submitting.value = false;
  }
}
</script>

<style>
.modal-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
}

.modal-content {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1.5rem;
    width: 360px;
}
</style>

<style scoped>
h3 {
    margin: 0 0 1rem;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
}

.form-field label {
    font-size: 0.75rem;
    font-variant: small-caps;
    letter-spacing: 0.05em;
    color: #999;
}

.form-field input {
    padding: 0.4rem 0.5rem;
    background: #111;
    border: 1px solid #444;
    border-radius: 4px;
    color: #eee;
    font-size: 0.85rem;
}

.form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1rem;
}

.form-actions button {
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: #fff;
}

.cancel-btn {
    background: #333;
}

.cancel-btn:hover {
    background: #444;
}

.submit-btn {
    background: #166534;
}

.submit-btn:hover:not(:disabled) {
    background: #15803d;
}

.submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.error {
    color: #f87171;
    font-size: 0.8rem;
    margin-top: 0.5rem;
}
</style>
