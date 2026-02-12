import { Router } from "express";
import { railwayQuery } from "./railway";

export const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = (await railwayQuery(
      req.session?.accessToken ?? "",
      `query {
        externalWorkspaces {
          id
          name
          projects { id name description }
        }
      }`,
    )) as {
      externalWorkspaces: {
        id: string;
        name: string;
        projects: { id: string; name: string; description: string }[];
      }[];
    };
    const projects = data.externalWorkspaces.flatMap((ws) =>
      ws.projects.map((p) => ({ ...p, workspace: ws.name })),
    );
    res.json(projects);
  } catch (err) {
    console.error("Failed to fetch projects:", err);
    res.status(502).json({ error: "Failed to fetch projects from Railway" });
  }
});

router.post("/:id/services", async (req, res) => {
  try {
    const { name, image } = req.body as {
      name: string;
      image: string;
      environmentId?: string;
    };

    if (!name || !image) {
      res.status(400).json({ error: "name and image are required" });
      return;
    }

    const token = req.session?.accessToken ?? "";

    const data = (await railwayQuery(
      token,
      `mutation serviceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) { id name }
      }`,
      {
        input: {
          projectId: req.params.id,
          name,
          source: { image },
        },
      },
    )) as { serviceCreate: { id: string; name: string } };

    res.json(data.serviceCreate);
  } catch (err) {
    console.error("Failed to create service:", err);
    res.status(502).json({ error: "Failed to create service on Railway" });
  }
});

router.get("/:id/services", async (req, res) => {
  try {
    const token = req.session?.accessToken ?? "";
    const projectData = (await railwayQuery(
      token,
      `query project($id: String!) {
        project(id: $id) {
          id
          name
          services { edges { node { id name icon createdAt } } }
          environments { edges { node { id name } } }
        }
      }`,
      { id: req.params.id },
    )) as {
      project: {
        id: string;
        name: string;
        services: {
          edges: {
            node: {
              id: string;
              name: string;
              icon: string | null;
              createdAt: string;
            };
          }[];
        };
        environments: { edges: { node: { id: string; name: string } }[] };
      };
    };

    const services = projectData.project.services.edges.map((e) => e.node);
    const environments = projectData.project.environments.edges.map(
      (e) => e.node,
    );
    const envId = environments[0]?.id;

    // Fetch service instance details per service
    const servicesWithDetails = await Promise.all(
      services.map(async (svc) => {
        if (!envId) {
          return { ...svc, latestDeployment: null };
        }
        const result = await railwayQuery(
          token,
          `query serviceInstance($serviceId: String!, $environmentId: String!) {
            serviceInstance(serviceId: $serviceId, environmentId: $environmentId) {
              id
              serviceName
              latestDeployment {
                id
                status
                createdAt
              }
            }
          }`,
          { serviceId: svc.id, environmentId: envId },
        );

        const instance = (
          result as {
            serviceInstance: {
              id: string;
              serviceName: string;
              latestDeployment: {
                id: string;
                status: string;
                createdAt: string;
              } | null;
            } | null;
          }
        )?.serviceInstance;

        return {
          ...svc,
          latestDeployment: instance?.latestDeployment ?? null,
        };
      }),
    );

    res.json({
      ...projectData.project,
      services: servicesWithDetails,
      environments,
    });
  } catch (err) {
    console.error("Failed to fetch project services:", err);
    res.status(502).json({ error: "Failed to fetch project from Railway" });
  }
});

router.get("/:projectId/services/:serviceId", async (req, res) => {
  const token = req.session?.accessToken ?? "";
  const { projectId, serviceId } = req.params;
  const environmentId = req.query.environmentId as string | undefined;

  if (!environmentId) {
    res.status(400).json({ error: "environmentId query parameter required" });
    return;
  }

  try {
    const [instanceData, depData] = await Promise.all([
      railwayQuery(
        token,
        `query serviceInstance($serviceId: String!, $environmentId: String!) {
            serviceInstance(serviceId: $serviceId, environmentId: $environmentId) {
              region
              numReplicas
              startCommand
              healthcheckPath
            }
          }`,
        { serviceId, environmentId },
      ),
      railwayQuery(
        token,
        `query deployments($input: DeploymentListInput!, $first: Int) {
            deployments(input: $input, first: $first) {
              edges { node { id status createdAt staticUrl meta } }
            }
          }`,
        {
          input: { projectId, serviceId, environmentId },
          first: 1,
        },
      ),
    ]);

    const instance =
      (
        instanceData as {
          serviceInstance: {
            region: string | null;
            numReplicas: number;
            startCommand: string | null;
            healthcheckPath: string | null;
          };
        }
      )?.serviceInstance ?? null;

    const latestNode =
      (
        depData as {
          deployments: {
            edges: {
              node: {
                id: string;
                status: string;
                createdAt: string;
                staticUrl: string | null;
                meta: Record<string, unknown> | null;
              };
            }[];
          };
        }
      )?.deployments.edges[0]?.node ?? null;

    const latestDeployment = latestNode
      ? {
          id: latestNode.id,
          status: latestNode.status,
          createdAt: latestNode.createdAt,
          staticUrl: latestNode.staticUrl,
          image: (latestNode.meta?.image as string) ?? null,
          repo: (latestNode.meta?.repo as string) ?? null,
        }
      : null;

    res.json({ instance, latestDeployment });
  } catch (err) {
    console.error("Failed to fetch service status:", err);
    res
      .status(502)
      .json({ error: "Failed to fetch service status from Railway" });
  }
});

router.post("/:projectId/services/:serviceId/deploy", async (req, res) => {
  try {
    await railwayQuery(
      req.session?.accessToken ?? "",
      `mutation serviceInstanceDeployV2($serviceId: String!, $environmentId: String!) {
          serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId)
        }`,
      {
        serviceId: req.params.serviceId,
        environmentId: req.body.environmentId,
      },
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to deploy service:", err);
    res.status(502).json({ error: "Failed to deploy service on Railway" });
  }
});

router.delete("/:projectId/deployments/:deploymentId", async (req, res) => {
  try {
    await railwayQuery(
      req.session?.accessToken ?? "",
      `mutation deploymentRemove($id: String!) {
        deploymentRemove(id: $id)
      }`,
      { id: req.params.deploymentId },
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to remove deployment:", err);
    res.status(502).json({ error: "Failed to remove deployment from Railway" });
  }
});
