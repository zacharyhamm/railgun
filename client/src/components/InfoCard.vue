<template>
  <div class="card">
    <div class="card-header">
      <img v-if="icon" class="card-icon" :src="icon" :alt="title" />
      <strong>{{ title }}</strong>
    </div>
    <div class="card-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  icon?: string | null;
}>();
</script>

<style scoped>
.card {
  border: 1px solid #333;
  border-radius: 6px;
  padding: 0.75rem;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.card-icon {
  width: 1.2rem;
  height: 1.2rem;
  object-fit: contain;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #aaa;
}

.card-body :deep(a) {
  color: #7cb3ff;
  text-decoration: underline;
  word-break: break-all;
}
</style>
