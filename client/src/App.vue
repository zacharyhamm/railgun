<template>
  <div>
    <h1>Railgun</h1>
    <template v-if="authenticated">
      <p>{{ message }}</p>
      <button @click="logout">Logout</button>
    </template>
    <template v-else>
      <a href="/oauth/authorize">
        <button>Login with Railway</button>
      </a>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

const authenticated = ref(false);
const message = ref("");

function getToken(): string | null {
  return localStorage.getItem("token");
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
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
    const data = await res.json();
    message.value = `API status: ${data.status}`;
    authenticated.value = true;
  } else {
    clearToken();
  }
});
</script>
