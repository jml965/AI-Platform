import { Router, type IRouter } from "express";
import { DeployProjectBody } from "@workspace/api-zod";
import { getUserId } from "../middlewares/permissions";
import {
  deployProject,
  undeployProject,
  redeployProject,
  getDeploymentStatus,
  listUserDeployments,
} from "../lib/deployment-manager";

const router: IRouter = Router();

function formatDeployment(d: any) {
  return {
    id: d.id,
    projectId: d.projectId,
    subdomain: d.subdomain,
    url: d.url,
    status: d.status,
    version: d.version,
    projectName: d.projectName ?? null,
    lastDeployedAt: d.lastDeployedAt?.toISOString?.() ?? d.lastDeployedAt ?? null,
    createdAt: d.createdAt?.toISOString?.() ?? d.createdAt ?? null,
  };
}

function mapErrorToResponse(res: any, error: any, fallbackMsg: string) {
  const message = error?.message || fallbackMsg;
  if (message.includes("not found") || message.includes("Not found") || message.includes("No deployment")) {
    res.status(404).json({ error: { code: "NOT_FOUND", message } });
  } else if (message.includes("Access denied")) {
    res.status(403).json({ error: { code: "FORBIDDEN", message } });
  } else if (message.includes("must be in") || message.includes("No files") || message.includes("Deploy the project first")) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message } });
  } else {
    res.status(500).json({ error: { code: "INTERNAL", message } });
  }
}

router.post("/deployments/deploy", async (req, res) => {
  try {
    const userId = getUserId(req);
    const body = DeployProjectBody.parse(req.body);
    const deployment = await deployProject(body.projectId, userId);
    res.json(formatDeployment(deployment));
  } catch (error: any) {
    mapErrorToResponse(res, error, "Deployment failed");
  }
});

router.get("/deployments/:projectId/status", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { projectId } = req.params;
    const deployment = await getDeploymentStatus(projectId, userId);
    if (!deployment) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "No deployment found" } });
      return;
    }
    res.json(formatDeployment(deployment));
  } catch (error: any) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get deployment status" } });
  }
});

router.post("/deployments/:projectId/undeploy", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { projectId } = req.params;
    const result = await undeployProject(projectId, userId);
    res.json(result);
  } catch (error: any) {
    mapErrorToResponse(res, error, "Undeploy failed");
  }
});

router.post("/deployments/:projectId/redeploy", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { projectId } = req.params;
    const deployment = await redeployProject(projectId, userId);
    res.json(formatDeployment(deployment));
  } catch (error: any) {
    mapErrorToResponse(res, error, "Redeploy failed");
  }
});

router.get("/deployments", async (req, res) => {
  try {
    const userId = getUserId(req);
    const deployments = await listUserDeployments(userId);
    res.json({ data: deployments.map(formatDeployment) });
  } catch (error: any) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to list deployments" } });
  }
});

export default router;
