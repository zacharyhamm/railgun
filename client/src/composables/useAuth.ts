import { readonly, ref } from "vue";
import router from "../router";

const token = ref<string | null>(localStorage.getItem("token"));
const authenticated = ref(false);

export function getToken(): string | null {
  return token.value;
}

function setToken(t: string) {
  token.value = t;
  localStorage.setItem("token", t);
}

function clearToken() {
  token.value = null;
  localStorage.removeItem("token");
}

export function useAuth() {
  async function init() {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
      history.replaceState({}, "", window.location.pathname);
    }

    if (!token.value) return;

    const res = await fetch("/api/health", {
      headers: { Authorization: `Bearer ${token.value}` },
    });

    if (res.ok) {
      authenticated.value = true;
    } else {
      clearToken();
    }
  }

  async function logout() {
    if (token.value) {
      await fetch("/oauth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token.value}` },
      });
    }
    clearToken();
    authenticated.value = false;
    router.push("/");
  }

  return {
    token: readonly(token),
    authenticated: readonly(authenticated),
    init,
    logout,
  };
}
