import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, projectsTable, buildTasksTable } from "@workspace/db/schema";
import { eq, sql, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/authSession";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required", errorAr: "يجب أن تكون مديراً للوصول" });
  }
  next();
}

router.get("/admin/stats/overview", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [userCount] = await db.select({ cnt: sql<number>`count(*)::int` }).from(usersTable);
    const [projectCount] = await db.select({ cnt: sql<number>`count(*)::int` }).from(projectsTable);
    const [buildCount] = await db.select({ cnt: sql<number>`count(*)::int` }).from(buildTasksTable);

    const [tokenStats] = await db.select({
      totalTokens: sql<number>`COALESCE(SUM(tokens_used), 0)::int`,
      totalCost: sql<string>`COALESCE(ROUND(SUM(cost_usd::numeric), 4), 0)::text`,
    }).from(buildTasksTable);

    const [todayStats] = await db.select({
      todayTokens: sql<number>`COALESCE(SUM(tokens_used), 0)::int`,
      todayCost: sql<string>`COALESCE(ROUND(SUM(cost_usd::numeric), 4), 0)::text`,
      todayBuilds: sql<number>`count(*)::int`,
    }).from(buildTasksTable).where(sql`created_at >= CURRENT_DATE`);

    const [monthStats] = await db.select({
      monthTokens: sql<number>`COALESCE(SUM(tokens_used), 0)::int`,
      monthCost: sql<string>`COALESCE(ROUND(SUM(cost_usd::numeric), 4), 0)::text`,
    }).from(buildTasksTable).where(sql`created_at >= date_trunc('month', CURRENT_DATE)`);

    return res.json({
      users: userCount?.cnt ?? 0,
      projects: projectCount?.cnt ?? 0,
      totalBuilds: buildCount?.cnt ?? 0,
      totalTokens: tokenStats?.totalTokens ?? 0,
      totalCost: parseFloat(tokenStats?.totalCost ?? "0"),
      todayTokens: todayStats?.todayTokens ?? 0,
      todayCost: parseFloat(todayStats?.todayCost ?? "0"),
      todayBuilds: todayStats?.todayBuilds ?? 0,
      monthTokens: monthStats?.monthTokens ?? 0,
      monthCost: parseFloat(monthStats?.monthCost ?? "0"),
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return res.status(500).json({ error: "Failed to fetch overview stats" });
  }
});

router.get("/admin/stats/agents", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const agentStats = await db.select({
      agentType: buildTasksTable.agentType,
      runs: sql<number>`count(*)::int`,
      tokens: sql<number>`COALESCE(SUM(tokens_used), 0)::int`,
      cost: sql<string>`COALESCE(ROUND(SUM(cost_usd::numeric), 4), 0)::text`,
      avgDuration: sql<string>`COALESCE(ROUND(AVG(duration_ms)::numeric, 0), 0)::text`,
      successCount: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int`,
      failCount: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int`,
    }).from(buildTasksTable)
      .groupBy(buildTasksTable.agentType)
      .orderBy(sql`SUM(cost_usd::numeric) DESC NULLS LAST`);

    return res.json(agentStats.map(a => ({
      ...a,
      cost: parseFloat(a.cost),
      avgDuration: parseInt(a.avgDuration),
    })));
  } catch (error) {
    console.error("Admin agents stats error:", error);
    return res.status(500).json({ error: "Failed to fetch agent stats" });
  }
});

router.get("/admin/stats/projects", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const projectStats = await db.select({
      projectId: projectsTable.id,
      projectName: projectsTable.name,
      status: projectsTable.status,
      totalTokens: projectsTable.totalTokensUsed,
      totalCost: projectsTable.totalCostUsd,
      createdAt: projectsTable.createdAt,
      userName: usersTable.displayName,
      userEmail: usersTable.email,
    }).from(projectsTable)
      .leftJoin(usersTable, eq(projectsTable.userId, usersTable.id))
      .orderBy(desc(projectsTable.createdAt));

    return res.json(projectStats.map(p => ({
      ...p,
      totalTokens: p.totalTokens ?? 0,
      totalCost: parseFloat(p.totalCost ?? "0"),
    })));
  } catch (error) {
    console.error("Admin projects stats error:", error);
    return res.status(500).json({ error: "Failed to fetch project stats" });
  }
});

router.get("/admin/stats/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const userStats = await db.select({
      userId: usersTable.id,
      displayName: usersTable.displayName,
      email: usersTable.email,
      role: usersTable.role,
      creditBalance: usersTable.creditBalanceUsd,
      dailyLimit: usersTable.dailyLimitUsd,
      monthlyLimit: usersTable.monthlyLimitUsd,
      createdAt: usersTable.createdAt,
      projectCount: sql<number>`(SELECT count(*)::int FROM projects WHERE projects.user_id = users.id)`,
      totalTokens: sql<number>`(SELECT COALESCE(SUM(bt.tokens_used), 0)::int FROM build_tasks bt JOIN projects p ON bt.project_id = p.id WHERE p.user_id = users.id)`,
      totalCost: sql<string>`(SELECT COALESCE(ROUND(SUM(bt.cost_usd::numeric), 4), 0)::text FROM build_tasks bt JOIN projects p ON bt.project_id = p.id WHERE p.user_id = users.id)`,
    }).from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    return res.json(userStats.map(u => ({
      ...u,
      creditBalance: parseFloat(u.creditBalance ?? "0"),
      totalCost: parseFloat(u.totalCost ?? "0"),
    })));
  } catch (error) {
    console.error("Admin users stats error:", error);
    return res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

router.get("/admin/stats/daily", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const dailyStats = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        count(*)::int as builds,
        COALESCE(SUM(tokens_used), 0)::int as tokens,
        COALESCE(ROUND(SUM(cost_usd::numeric), 4), 0)::float as cost
      FROM build_tasks
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `);
    return res.json(dailyStats.rows);
  } catch (error) {
    console.error("Admin daily stats error:", error);
    return res.status(500).json({ error: "Failed to fetch daily stats" });
  }
});

export default router;
