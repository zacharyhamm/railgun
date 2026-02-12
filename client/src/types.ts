export interface Project {
  id: string;
  name: string;
  description: string;
  workspace: string;
}

export interface Deployment {
  id: string;
  status: string;
  createdAt: string;
  staticUrl: string | null;
  image: string | null;
  repo: string | null;
}

export interface ServiceInstance {
  region: string | null;
  numReplicas: number;
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

export interface Environment {
  id: string;
  name: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  services: RailwayService[];
  environments: Environment[];
}

export interface ServiceStatus {
  instance: ServiceInstance | null;
  latestDeployment: Deployment | null;
}
