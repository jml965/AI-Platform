import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { buildTasksTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/agents/status", async (_req, res) => {
  try {
    const agentTypes = ["codegen", "reviewer", "fixer", "filemanager"] as const;

    const agentCounts = await db
      .select({
        agentType: buildTasksTable.agentType,
        active: sql<number>`count(*) filter (where ${buildTasksTable.status} = 'in_progress')::int`,
        completed: sql<number>`count(*) filter (where ${buildTasksTable.status} = 'completed')::int`,
        failed: sql<number>`count(*) filter (where ${buildTasksTable.status} = 'failed')::int`,
      })
      .from(buildTasksTable)
      .groupBy(buildTasksTable.agentType);

    const countsMap = new Map(agentCounts.map((c) => [c.agentType, c]));

    const agents = agentTypes.map((agentType) => {
      const counts = countsMap.get(agentType);
      return {
        agentType,
        activeTasks: counts?.active ?? 0,
        totalCompleted: counts?.completed ?? 0,
        totalFailed: counts?.failed ?? 0,
      };
    });

    res.json({ agents });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get agents status" } });
  }
});

router.get("/agents/tasks/:taskId", async (req, res) => {
  try {
    const [task] = await db
      .select()
      .from(buildTasksTable)
      .where(eq(buildTasksTable.id, req.params.taskId))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
      return;
    }

    res.json({
      id: task.id,
      projectId: task.projectId,
      agentType: task.agentType,
      status: task.status,
      targetFile: task.targetFile,
      tokensUsed: task.tokensUsed ?? 0,
      costUsd: Number(task.costUsd) || 0,
      retryCount: task.retryCount ?? 0,
      durationMs: task.durationMs,
      errorMessage: task.errorMessage,
      createdAt: task.createdAt.toISOString(),
      completedAt: task.completedAt?.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get task" } });
  }
});

export default router;
