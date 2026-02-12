<template>
  <div>
    <h1>Railgun</h1>
    <template v-if="authenticated">
      <button @click="logout">Logout</button>
      <router-view />
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
import { onMounted } from "vue";
// biome-ignore lint/correctness/noUnusedImports: template ref
import { ModalsContainer } from "vue-final-modal";
import { useAuth } from "./composables/useAuth";

// biome-ignore lint/correctness/noUnusedVariables: template refs
const { authenticated, init, logout } = useAuth();

onMounted(init);
</script>
