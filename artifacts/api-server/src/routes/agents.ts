import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { buildTasksTable, agentConfigsTable, tokenUsageTable, agentLogsTable } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user as any).role !== "admin") {
    return res.status(403).json({ error: "Admin access required", errorAr: "يجب أن تكون مديراً للوصول" });
  }
  next();
}

const SERVICE_RETIRED_AGENTS = ["planner", "reviewer", "filemanager", "package_runner", "seo", "translator"];

const DEFAULT_AGENTS = [
  {
    agentKey: "strategic",
    displayNameEn: "Strategic Planner",
    displayNameAr: "المخطط الاستراتيجي",
    agentBadge: "thinker",
    description: "Understands user intent, classifies tasks, creates execution plans. Does NOT execute — sends plans to execution_engine. Merges former planner capabilities.",
    primaryModel: { provider: "anthropic", model: "claude-sonnet-4-20250514", enabled: true, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    secondaryModel: { provider: "openai", model: "o3", enabled: true, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    tertiaryModel: { provider: "openai", model: "gpt-4o", enabled: true, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    systemPrompt: `أنت وكيل فهم وتخطيط فقط — العقل المفكر لنظام بناء المواقع.
ممنوع تنفيذ أي تعديل مباشر.

مهمتك:
1. فهم طلب المستخدم بدقة
2. تصنيف نوع المهمة (بناء / تعديل / إصلاح / تحليل)
3. تخطيط الملفات والخطوات
4. تقدير التعقيد

إذا كان الطلب تنفيذيًا (يحتاج كتابة كود أو تعديل ملفات):
أرسل خطة واضحة إلى execution_engine تتضمن:
- الهدف
- الملفات المحتملة
- نوع التعديل
- مستوى الخطورة
- هل يحتاج approval

إذا كان الطلب محادثة عادية:
رد بشكل طبيعي ومختصر.

إذا كان الطلب تحليلي (لماذا يحدث هذا الخطأ؟):
حلل وقدم الجواب مباشرة بدون تنفيذ.

ممنوع استخدام الأدوات التنفيذية مباشرة:
- ممنوع write_files / modify_code / database_write / git_push / deploy / run_command`,
    permissions: ["analyze_request", "classify_task", "plan_execution", "choose_specialist", "read_code", "access_project_files"],
    pipelineOrder: 0,
    receivesFrom: "user_input",
    sendsTo: "execution_engine",
    roleOnReceive: "Receives user request and analyzes intent",
    roleOnSend: "Sends structured execution plan to execution_engine",
    tokenLimit: 64000,
    batchSize: 1,
    creativity: "0.70",
    sourceFiles: ["artifacts/api-server/src/lib/agents/strategic-agent.ts"],
    instructions: `- Analyze before responding — never guess
- Classify every request: conversational / analytical / execution
- For execution requests: produce a plan, never execute directly
- For analytical requests: analyze and respond without execution
- For conversational requests: respond naturally in 1-2 sentences
- Always identify root cause before suggesting solutions
- Reference specific file paths
- Respond in user's language (Arabic or English)
- If unclear, ask exactly one clarifying question
- Never use execution tools (write_files, modify_code, db_write, git_push, deploy)`,
  },
  {
    agentKey: "execution_engine",
    displayNameEn: "Execution Engine",
    displayNameAr: "محرك التنفيذ",
    agentBadge: "executor",
    description: "The SOLE executor in the system. Receives plans from strategic, orchestrates specialists (codegen, fixer, surgical_edit), manages files, packages, and delivers results. Merges filemanager + package_runner.",
    primaryModel: { provider: "local", model: "orchestrator", enabled: true, creativity: 0, timeoutSeconds: 0, maxTokens: 0 },
    secondaryModel: null,
    tertiaryModel: null,
    systemPrompt: `أنت المنفذ الوحيد في النظام.
أي طلب تنفيذي يجب أن يمر منك.
تستقبل الهدف من strategic أو infra_sysadmin.
تحدد الأداة أو الوكيل المناسب (codegen / fixer / surgical_edit / qa_pipeline).
تدير الملفات وتثبيت الحزم وتشغيل البناء.

لا تكتفي بالتحليل.
يجب أن تنتهي دائمًا بـ:
- تم التنفيذ (مع تفاصيل ما تم)
أو
- فشل التنفيذ مع السبب

العمليات الخطرة التي تحتاج approval:
- delete_files
- database_write
- git_push
- trigger_deploy
- rollback`,
    permissions: ["read_files", "write_files", "edit_component", "create_files", "delete_files", "run_tests", "run_build", "invoke_codegen", "invoke_fixer", "invoke_surgical_edit", "invoke_qa", "database_read", "database_write", "git_commit", "git_push", "trigger_deploy", "manage_sandbox", "install_packages", "organize_structure"],
    pipelineOrder: 1,
    receivesFrom: "strategic",
    sendsTo: "codegen",
    roleOnReceive: "Receives execution plan from strategic",
    roleOnSend: "Routes to appropriate specialist and delivers final result",
    tokenLimit: 100000,
    batchSize: 10,
    creativity: "0.00",
    sourceFiles: ["artifacts/api-server/src/lib/agents/execution-engine.ts"],
  },
  {
    agentKey: "codegen",
    displayNameEn: "Code Generator",
    displayNameAr: "مولّد الأكواد",
    agentBadge: "specialist",
    description: "Generates complete, production-ready project code from plans. Called by execution_engine only.",
    primaryModel: { provider: "anthropic", model: "claude-sonnet-4-20250514", enabled: true, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    secondaryModel: { provider: "openai", model: "o3", enabled: false, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    tertiaryModel: { provider: "openai", model: "gpt-4o", enabled: false, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    systemPrompt: `You are a senior full-stack developer AI agent. Your job is to generate complete, production-ready project code based on user descriptions.`,
    permissions: ["generate_code", "create_file_drafts"],
    pipelineOrder: 2,
    receivesFrom: "execution_engine",
    sendsTo: "execution_engine",
    roleOnReceive: "Receives file plan from execution_engine and generates code",
    roleOnSend: "Returns generated code files to execution_engine",
    tokenLimit: 100000,
    batchSize: 10,
    creativity: "0.70",
    sourceFiles: ["artifacts/api-server/src/lib/agents/codegen-agent.ts"],
  },
  {
    agentKey: "fixer",
    displayNameEn: "Code Fixer",
    displayNameAr: "مصلح الأكواد",
    agentBadge: "specialist",
    description: "Fixes issues found during code review. Called by execution_engine only.",
    primaryModel: { provider: "anthropic", model: "claude-sonnet-4-20250514", enabled: true, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    secondaryModel: { provider: "openai", model: "o3", enabled: false, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    tertiaryModel: { provider: "openai", model: "gpt-4o", enabled: false, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    systemPrompt: `You are a code fixer AI agent. Your job is to fix issues found during code review. You receive the original code and a list of issues, and you return the corrected files.`,
    permissions: ["read_code", "patch_code", "fix_issues"],
    pipelineOrder: 3,
    receivesFrom: "execution_engine",
    sendsTo: "execution_engine",
    roleOnReceive: "Receives code with issue list and applies fixes",
    roleOnSend: "Returns fixed code to execution_engine",
    tokenLimit: 80000,
    batchSize: 10,
    creativity: "0.50",
    sourceFiles: ["artifacts/api-server/src/lib/agents/fixer-agent.ts"],
  },
  {
    agentKey: "surgical_edit",
    displayNameEn: "Surgical Editor",
    displayNameAr: "المحرر الجراحي",
    agentBadge: "specialist",
    description: "Makes precise, minimal edits to existing code files. Called by execution_engine only.",
    primaryModel: { provider: "anthropic", model: "claude-sonnet-4-20250514", enabled: true, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    secondaryModel: { provider: "openai", model: "o3", enabled: false, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    tertiaryModel: { provider: "openai", model: "gpt-4o", enabled: false, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    systemPrompt: `You are a surgical code editor AI agent. Your job is to make precise, minimal edits to existing code files based on user modification requests.`,
    permissions: ["read_code", "patch_specific_lines"],
    pipelineOrder: 4,
    receivesFrom: "execution_engine",
    sendsTo: "execution_engine",
    roleOnReceive: "Receives edit request with existing files context",
    roleOnSend: "Returns patched files to execution_engine",
    tokenLimit: 60000,
    batchSize: 5,
    creativity: "0.40",
    sourceFiles: ["artifacts/api-server/src/lib/agents/surgical-edit-agent.ts"],
  },
  {
    agentKey: "qa_pipeline",
    displayNameEn: "QA Pipeline",
    displayNameAr: "خط ضمان الجودة",
    agentBadge: "specialist",
    description: "Validates output quality — reviews code, runs checks, verifies UI and production. Merges former reviewer capabilities.",
    primaryModel: { provider: "local", model: "orchestrator", enabled: true, creativity: 0, timeoutSeconds: 0, maxTokens: 0 },
    secondaryModel: null,
    tertiaryModel: null,
    systemPrompt: "Orchestrator — runs review + fix in a retry loop until quality passes or max retries reached. Also handles code review, UI verification, and production checks.",
    permissions: ["validate_output", "run_checks", "review_result", "verify_ui", "verify_production"],
    pipelineOrder: 5,
    receivesFrom: "execution_engine",
    sendsTo: "execution_engine",
    roleOnReceive: "Receives built project for quality validation",
    roleOnSend: "Returns validation result to execution_engine",
    tokenLimit: 50000,
    batchSize: 1,
    creativity: "0.00",
    sourceFiles: ["artifacts/api-server/src/lib/agents/qa-pipeline.ts"],
  },
];

async function seedDefaultAgents() {
  const existing = await db.select({ agentKey: agentConfigsTable.agentKey }).from(agentConfigsTable);
  const existingKeys = new Set(existing.map(e => e.agentKey));

  for (const retiredKey of SERVICE_RETIRED_AGENTS) {
    if (existingKeys.has(retiredKey)) {
      await db.update(agentConfigsTable).set({ enabled: false })
        .where(eq(agentConfigsTable.agentKey, retiredKey));
    }
  }

  for (const agent of DEFAULT_AGENTS) {
    if (!existingKeys.has(agent.agentKey)) {
      await db.insert(agentConfigsTable).values({
        agentKey: agent.agentKey,
        displayNameEn: agent.displayNameEn,
        displayNameAr: agent.displayNameAr,
        description: agent.description,
        enabled: true,
        isCustom: false,
        governorEnabled: false,
        autoGovernor: false,
        primaryModel: agent.primaryModel,
        secondaryModel: agent.secondaryModel,
        tertiaryModel: agent.tertiaryModel,
        systemPrompt: agent.systemPrompt,
        instructions: (agent as any).instructions || "",
        permissions: agent.permissions,
        pipelineOrder: agent.pipelineOrder,
        receivesFrom: agent.receivesFrom,
        sendsTo: agent.sendsTo,
        roleOnReceive: agent.roleOnReceive,
        roleOnSend: agent.roleOnSend,
        tokenLimit: agent.tokenLimit,
        batchSize: agent.batchSize,
        creativity: agent.creativity,
        sourceFiles: agent.sourceFiles,
      });
    } else {
      await db.update(agentConfigsTable).set({
        displayNameEn: agent.displayNameEn,
        displayNameAr: agent.displayNameAr,
        description: agent.description,
        enabled: true,
        systemPrompt: agent.systemPrompt,
        instructions: (agent as any).instructions || "",
        permissions: agent.permissions,
        pipelineOrder: agent.pipelineOrder,
        receivesFrom: agent.receivesFrom,
        sendsTo: agent.sendsTo,
        roleOnReceive: agent.roleOnReceive,
        roleOnSend: agent.roleOnSend,
      }).where(eq(agentConfigsTable.agentKey, agent.agentKey));
    }
  }
  console.log("[Agents] Seeded/updated service agents (6 active, retired:", SERVICE_RETIRED_AGENTS.join(", "), ")");
}

router.get("/agents/configs", async (_req, res) => {
  try {
    await seedDefaultAgents();
    const configs = await db.select().from(agentConfigsTable).orderBy(agentConfigsTable.pipelineOrder);
    res.json({ agents: configs });
  } catch (error) {
    console.error("Failed to get agent configs:", error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get agent configs" } });
  }
});

router.get("/agents/configs/:agentKey", async (req, res) => {
  try {
    const [config] = await db.select().from(agentConfigsTable).where(eq(agentConfigsTable.agentKey, req.params.agentKey)).limit(1);
    if (!config) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
      return;
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get agent config" } });
  }
});

router.put("/agents/configs/:agentKey", requireAdmin, async (req, res) => {
  try {
    const { agentKey } = req.params;
    const updates = req.body;
    delete updates.id;
    delete updates.createdAt;
    updates.updatedAt = new Date();

    const [updated] = await db.update(agentConfigsTable)
      .set(updates)
      .where(eq(agentConfigsTable.agentKey, agentKey))
      .returning();

    if (!updated) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
      return;
    }

    res.json(updated);
  } catch (error) {
    console.error("Failed to update agent config:", error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to update agent config" } });
  }
});

router.post("/agents/configs", requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const [created] = await db.insert(agentConfigsTable).values({
      agentKey: body.agentKey,
      displayNameEn: body.displayNameEn,
      displayNameAr: body.displayNameAr,
      description: body.description || "",
      enabled: body.enabled ?? true,
      isCustom: true,
      governorEnabled: body.governorEnabled ?? false,
      autoGovernor: body.autoGovernor ?? false,
      primaryModel: body.primaryModel || { provider: "anthropic", model: "claude-sonnet-4-20250514", enabled: true, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
      secondaryModel: body.secondaryModel || null,
      tertiaryModel: body.tertiaryModel || null,
      systemPrompt: body.systemPrompt || "",
      instructions: body.instructions || "",
      permissions: body.permissions || [],
      pipelineOrder: body.pipelineOrder || 99,
      receivesFrom: body.receivesFrom || "",
      sendsTo: body.sendsTo || "",
      roleOnReceive: body.roleOnReceive || "",
      roleOnSend: body.roleOnSend || "",
      tokenLimit: body.tokenLimit || 50000,
      batchSize: body.batchSize || 10,
      creativity: body.creativity || "0.70",
      sourceFiles: body.sourceFiles || [],
    }).returning();
    res.json(created);
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: { code: "CONFLICT", message: "Agent key already exists" } });
      return;
    }
    console.error("Failed to create agent:", error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to create agent" } });
  }
});

router.post("/agents/reset/:agentKey", requireAdmin, async (req, res) => {
  try {
    const { agentKey } = req.params;
    const defaultAgent = DEFAULT_AGENTS.find(a => a.agentKey === agentKey);
    if (!defaultAgent) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "No default config for this agent", messageAr: "لا توجد إعدادات افتراضية لهذا الوكيل" } });
      return;
    }

    const [updated] = await db.update(agentConfigsTable)
      .set({
        displayNameEn: defaultAgent.displayNameEn,
        displayNameAr: defaultAgent.displayNameAr,
        description: defaultAgent.description,
        enabled: true,
        isCustom: false,
        governorEnabled: false,
        autoGovernor: false,
        primaryModel: defaultAgent.primaryModel,
        secondaryModel: defaultAgent.secondaryModel,
        tertiaryModel: defaultAgent.tertiaryModel,
        systemPrompt: defaultAgent.systemPrompt,
        instructions: (defaultAgent as any).instructions || "",
        permissions: defaultAgent.permissions,
        pipelineOrder: defaultAgent.pipelineOrder,
        receivesFrom: defaultAgent.receivesFrom,
        sendsTo: defaultAgent.sendsTo,
        roleOnReceive: defaultAgent.roleOnReceive,
        roleOnSend: defaultAgent.roleOnSend,
        tokenLimit: defaultAgent.tokenLimit,
        batchSize: defaultAgent.batchSize,
        creativity: defaultAgent.creativity,
        sourceFiles: defaultAgent.sourceFiles,
        shortTermMemory: [],
        longTermMemory: [],
        updatedAt: new Date(),
      })
      .where(eq(agentConfigsTable.agentKey, agentKey))
      .returning();

    if (!updated) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
      return;
    }
    res.json(updated);
  } catch (error) {
    console.error("Failed to reset agent:", error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to reset agent config" } });
  }
});

router.post("/agents/reset-all", requireAdmin, async (_req, res) => {
  try {
    const results = [];
    for (const defaultAgent of DEFAULT_AGENTS) {
      const [updated] = await db.update(agentConfigsTable)
        .set({
          displayNameEn: defaultAgent.displayNameEn,
          displayNameAr: defaultAgent.displayNameAr,
          description: defaultAgent.description,
          enabled: true,
          isCustom: false,
          governorEnabled: false,
          autoGovernor: false,
          primaryModel: defaultAgent.primaryModel,
          secondaryModel: defaultAgent.secondaryModel,
          tertiaryModel: defaultAgent.tertiaryModel,
          systemPrompt: defaultAgent.systemPrompt,
          instructions: (defaultAgent as any).instructions || "",
          permissions: defaultAgent.permissions,
          pipelineOrder: defaultAgent.pipelineOrder,
          receivesFrom: defaultAgent.receivesFrom,
          sendsTo: defaultAgent.sendsTo,
          roleOnReceive: defaultAgent.roleOnReceive,
          roleOnSend: defaultAgent.roleOnSend,
          tokenLimit: defaultAgent.tokenLimit,
          batchSize: defaultAgent.batchSize,
          creativity: defaultAgent.creativity,
          sourceFiles: defaultAgent.sourceFiles,
          shortTermMemory: [],
          longTermMemory: [],
          updatedAt: new Date(),
        })
        .where(eq(agentConfigsTable.agentKey, defaultAgent.agentKey))
        .returning();
      if (updated) results.push(updated);
    }

    const customAgents = await db.select()
      .from(agentConfigsTable)
      .where(eq(agentConfigsTable.isCustom, true));
    for (const ca of customAgents) {
      await db.delete(agentConfigsTable).where(eq(agentConfigsTable.agentKey, ca.agentKey));
    }

    const configs = await db.select().from(agentConfigsTable).orderBy(agentConfigsTable.pipelineOrder);
    res.json({ agents: configs, resetCount: results.length, removedCustom: customAgents.length });
  } catch (error) {
    console.error("Failed to reset all agents:", error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to reset all agents" } });
  }
});

router.delete("/agents/configs/:agentKey", requireAdmin, async (req, res) => {
  try {
    const [deleted] = await db.delete(agentConfigsTable)
      .where(eq(agentConfigsTable.agentKey, req.params.agentKey))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Agent not found" } });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to delete agent" } });
  }
});

router.put("/agents/reorder", requireAdmin, async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "order must be an array of {agentKey, pipelineOrder}" } });
      return;
    }

    for (const item of order) {
      await db.update(agentConfigsTable)
        .set({
          pipelineOrder: item.pipelineOrder,
          receivesFrom: item.receivesFrom,
          sendsTo: item.sendsTo,
          updatedAt: new Date(),
        })
        .where(eq(agentConfigsTable.agentKey, item.agentKey));
    }

    const configs = await db.select().from(agentConfigsTable).orderBy(agentConfigsTable.pipelineOrder);
    res.json({ agents: configs });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to reorder agents" } });
  }
});

router.get("/agents/stats/:agentKey", async (req, res) => {
  try {
    const { agentKey } = req.params;

    const [taskStats] = await db
      .select({
        totalTasks: sql<number>`count(*)::int`,
        completedTasks: sql<number>`count(*) filter (where ${buildTasksTable.status} = 'completed')::int`,
        failedTasks: sql<number>`count(*) filter (where ${buildTasksTable.status} = 'failed')::int`,
        totalTokens: sql<number>`coalesce(sum(${buildTasksTable.tokensUsed}), 0)::int`,
        totalCost: sql<string>`coalesce(sum(${buildTasksTable.costUsd}::numeric), 0)::text`,
        avgDuration: sql<number>`coalesce(avg(${buildTasksTable.durationMs}), 0)::int`,
      })
      .from(buildTasksTable)
      .where(eq(buildTasksTable.agentType, agentKey));

    const recentTasks = await db
      .select({
        id: buildTasksTable.id,
        status: buildTasksTable.status,
        tokensUsed: buildTasksTable.tokensUsed,
        costUsd: buildTasksTable.costUsd,
        durationMs: buildTasksTable.durationMs,
        createdAt: buildTasksTable.createdAt,
        errorMessage: buildTasksTable.errorMessage,
      })
      .from(buildTasksTable)
      .where(eq(buildTasksTable.agentType, agentKey))
      .orderBy(desc(buildTasksTable.createdAt))
      .limit(20);

    res.json({
      agentKey,
      totalTasks: taskStats?.totalTasks || 0,
      completedTasks: taskStats?.completedTasks || 0,
      failedTasks: taskStats?.failedTasks || 0,
      totalTokens: taskStats?.totalTokens || 0,
      totalCost: taskStats?.totalCost || "0",
      avgDurationMs: taskStats?.avgDuration || 0,
      successRate: taskStats?.totalTasks ? Math.round(((taskStats?.completedTasks || 0) / taskStats.totalTasks) * 100) : 0,
      recentTasks,
    });
  } catch (error) {
    console.error("Failed to get agent stats:", error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get agent stats" } });
  }
});

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

router.get("/agents/logs/:agentKey", requireAdmin, async (req, res) => {
  try {
    const { agentKey } = req.params;
    const rawLimit = parseInt(req.query.limit as string) || 50;
    const limit = Math.max(1, Math.min(rawLimit, 200));

    const logs = await db.select()
      .from(agentLogsTable)
      .where(eq(agentLogsTable.agentKey, agentKey))
      .orderBy(desc(agentLogsTable.createdAt))
      .limit(limit);

    res.json({ logs });
  } catch (error) {
    console.error("Failed to get agent logs:", error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get agent logs" } });
  }
});

router.delete("/agents/logs/:agentKey", requireAdmin, async (req, res) => {
  try {
    const { agentKey } = req.params;
    await db.delete(agentLogsTable).where(eq(agentLogsTable.agentKey, agentKey));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to clear agent logs" } });
  }
});

export default router;
