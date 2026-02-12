import { getToken } from "./composables/useAuth";
import type { Project, ProjectDetail, ServiceStatus } from "./types";

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  getProjects(): Promise<Project[]> {
    return request("/api/projects");
  },

  getProjectServices(projectId: string): Promise<ProjectDetail> {
    return request(`/api/projects/${projectId}/services`);
  },

  createService(
    projectId: string,
    name: string,
    image: string,
    environmentId?: string,
  ): Promise<{ id: string; name: string }> {
    return request(`/api/projects/${projectId}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, image, environmentId }),
    });
  },

  getServiceStatus(
    projectId: string,
    serviceId: string,
    environmentId: string,
  ): Promise<ServiceStatus> {
    return request(
      `/api/projects/${projectId}/services/${serviceId}?environmentId=${environmentId}`,
    );
  },

  deployService(
    projectId: string,
    serviceId: string,
    environmentId: string,
  ): Promise<{ ok: boolean }> {
    return request(`/api/projects/${projectId}/services/${serviceId}/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ environmentId }),
    });
  },

  removeDeployment(
    projectId: string,
    deploymentId: string,
  ): Promise<{ ok: boolean }> {
    return request(`/api/projects/${projectId}/deployments/${deploymentId}`, {
      method: "DELETE",
    });
  },
};
