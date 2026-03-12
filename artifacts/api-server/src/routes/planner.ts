import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, usersTable, teamMembersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  classifyComplexity,
  generatePlan,
  getPendingPlan,
  getAllPendingPlans,
  approvePlan,
  rejectPlan,
  modifyPlan,
  startBuildWithPlan,
  checkBuildLimits,
} from "../lib/agents";
import type { ProjectPlan } from "../lib/agents";
import { getUserId, getUserTeamRole, hasPermission } from "../middlewares/permissions";

const router: IRouter = Router();

async function verifyProjectAccess(userId: string, projectId: string, permission: "build.start" | "build.view") {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (!project) return { allowed: false, project: null, reason: "Project not found" };

  if (project.userId === userId) return { allowed: true, project, reason: null };

  if (project.teamId) {
    const role = await getUserTeamRole(userId, project.teamId);
    if (role && hasPermission(role, permission)) {
      return { allowed: true, project, reason: null };
    }
  }

  return { allowed: false, project: null, reason: "Access denied" };
}

function validatePlanShape(plan: unknown): plan is ProjectPlan {
  if (!plan || typeof plan !== "object") return false;
  const p = plan as Record<string, unknown>;
  if (typeof p.framework !== "string") return false;
  if (!Array.isArray(p.files)) return false;
  if (!Array.isArray(p.phases)) return false;
  for (const phase of p.phases) {
    if (!phase || typeof phase !== "object") return false;
    const ph = phase as Record<string, unknown>;
    if (typeof ph.name !== "string") return false;
    if (!Array.isArray(ph.files)) return false;
  }
  return true;
}

router.post("/planner/classify", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: { code: "VALIDATION", message: "prompt is required" } });
      return;
    }

    const complexity = classifyComplexity(prompt);
    res.json({ complexity, requiresPlanning: complexity === "complex" });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to classify request" } });
  }
});

router.post("/planner/generate", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { projectId, prompt } = req.body;

    if (!projectId || !prompt) {
      res.status(400).json({ error: { code: "VALIDATION", message: "projectId and prompt are required" } });
      return;
    }

    const access = await verifyProjectAccess(userId, projectId, "build.start");
    if (!access.allowed || !access.project) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: access.reason || "Access denied" } });
      return;
    }

    const limitResult = await checkBuildLimits(access.project.userId, projectId);
    if (!limitResult.allowed) {
      res.status(429).json({
        error: {
          code: "TOKEN_LIMIT_REACHED",
          message: limitResult.reason || "Spending limit reached",
          message_ar: limitResult.reasonAr,
        },
      });
      return;
    }

    const result = await generatePlan(projectId, access.project.userId, prompt);

    res.json({
      buildId: result.buildId,
      plan: result.plan,
      tokensUsed: result.tokensUsed,
      status: "pending_approval",
    });
  } catch (error) {
    console.error("Plan generation error:", error);
    res.status(500).json({
      error: {
        code: "PLANNING_FAILED",
        message: error instanceof Error ? error.message : "Failed to generate plan",
      },
    });
  }
});

router.get("/planner/:buildId", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { buildId } = req.params;

    const plan = getPendingPlan(buildId);
    if (!plan) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }

    const access = await verifyProjectAccess(userId, plan.projectId, "build.view");
    if (!access.allowed) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      return;
    }

    res.json({ data: plan });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get plan" } });
  }
});

router.get("/planner", async (req, res) => {
  try {
    const userId = getUserId(req);
    const plans = getAllPendingPlans(userId);
    res.json({ data: plans });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get plans" } });
  }
});

router.post("/planner/:buildId/approve", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { buildId } = req.params;

    const plan = getPendingPlan(buildId);
    if (!plan) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }

    const access = await verifyProjectAccess(userId, plan.projectId, "build.start");
    if (!access.allowed || !access.project) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: access.reason || "Access denied" } });
      return;
    }

    if (plan.status !== "pending_approval" && plan.status !== "modified") {
      res.status(409).json({ error: { code: "INVALID_STATE", message: `Plan is already ${plan.status}` } });
      return;
    }

    if (access.project.status === "building") {
      res.status(409).json({ error: { code: "BUILD_IN_PROGRESS", message: "A build is already in progress for this project" } });
      return;
    }

    const [userRecord] = await db
      .select({ creditBalanceUsd: usersTable.creditBalanceUsd })
      .from(usersTable)
      .where(eq(usersTable.id, access.project.userId))
      .limit(1);

    const creditBalance = parseFloat(userRecord?.creditBalanceUsd ?? "0");
    if (creditBalance <= 0) {
      res.status(402).json({
        error: {
          code: "INSUFFICIENT_CREDITS",
          message: "Insufficient credits to start build.",
          message_ar: "رصيد غير كافٍ لبدء البناء.",
        },
      });
      return;
    }

    const approved = approvePlan(buildId);
    if (!approved) {
      res.status(500).json({ error: { code: "INTERNAL", message: "Failed to approve plan" } });
      return;
    }

    const newBuildId = await startBuildWithPlan(
      approved.projectId,
      access.project.userId,
      approved.prompt,
      approved.plan
    );

    res.json({
      success: true,
      buildId: newBuildId,
      projectId: approved.projectId,
      status: "pending",
      message: "Plan approved, build started",
    });
  } catch (error) {
    console.error("Plan approval error:", error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to approve plan" } });
  }
});

router.post("/planner/:buildId/reject", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { buildId } = req.params;

    const plan = getPendingPlan(buildId);
    if (!plan) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }

    const access = await verifyProjectAccess(userId, plan.projectId, "build.view");
    if (!access.allowed) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      return;
    }

    rejectPlan(buildId);

    res.json({ success: true, message: "Plan rejected" });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to reject plan" } });
  }
});

router.put("/planner/:buildId", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { buildId } = req.params;
    const { plan: updatedPlan } = req.body;

    if (!validatePlanShape(updatedPlan)) {
      res.status(400).json({
        error: {
          code: "VALIDATION",
          message: "Invalid plan format. Required: framework (string), files (array), phases (array with name and files)",
        },
      });
      return;
    }

    const plan = getPendingPlan(buildId);
    if (!plan) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }

    const access = await verifyProjectAccess(userId, plan.projectId, "build.start");
    if (!access.allowed) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      return;
    }

    if (plan.status === "approved" || plan.status === "rejected") {
      res.status(409).json({ error: { code: "INVALID_STATE", message: `Cannot modify a ${plan.status} plan` } });
      return;
    }

    const modified = modifyPlan(buildId, updatedPlan);
    if (!modified) {
      res.status(500).json({ error: { code: "INTERNAL", message: "Failed to modify plan" } });
      return;
    }

    res.json({ success: true, data: modified });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to modify plan" } });
  }
});

export default router;
