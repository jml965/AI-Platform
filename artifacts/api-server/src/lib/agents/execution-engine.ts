import { db } from "@workspace/db";
import {
  buildTasksTable,
  executionLogsTable,
  projectsTable,
  tokenUsageTable,
  creditsLedgerTable,
  usersTable,
  notificationsTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getConstitution } from "./constitution";
import { CodeGenAgent } from "./codegen-agent";
import { ReviewerAgent } from "./reviewer-agent";
import { FixerAgent } from "./fixer-agent";
import { FileManagerAgent } from "./filemanager-agent";
import { SurgicalEditAgent, isModificationRequest } from "./surgical-edit-agent";
import { PackageRunnerAgent, setRunner, removeRunner } from "./package-runner-agent";
import { PlannerAgent, classifyComplexity } from "./planner-agent";
import { checkSpendingLimits, checkAndNotifyLimits } from "../token-limits";
import { runQaWithRetry } from "./qa-pipeline";
import { emitBuildComplete, emitBuildError } from "../notificationEvents";
import type {
  BuildContext,
  BuildStatus,
  GeneratedFile,
  CodeIssue,
  ProjectPlan,
} from "./types";

interface ActiveBuild {
  buildId: string;
  projectId: string;
  userId: string;
  status: BuildStatus;
  cancelRequested: boolean;
}

const activeBuilds = new Map<string, ActiveBuild>();

(async function cleanupStuckProjects() {
  try {
    const stuck = await db.execute(
      sql`UPDATE projects SET status = 'ready'
          WHERE status = 'building'
          AND id IN (SELECT DISTINCT project_id FROM project_files)
          RETURNING id, name`
    );
    const stuckDraft = await db.execute(
      sql`UPDATE projects SET status = 'draft'
          WHERE status = 'building'
          AND id NOT IN (SELECT DISTINCT project_id FROM project_files)
          RETURNING id, name`
    );
    await db.execute(
      sql`UPDATE build_tasks SET status = 'failed', completed_at = NOW()
          WHERE status = 'in_progress'
          AND created_at < NOW() - INTERVAL '5 minutes'`
    );
    const total = (stuck.rows?.length || 0) + (stuckDraft.rows?.length || 0);
    if (total > 0) {
      console.log(`[STARTUP] Fixed ${total} stuck project(s) from previous session`);
    }
  } catch (e) {
    console.error("[STARTUP] Failed to cleanup stuck projects:", e);
  }
})();

export function getActiveBuild(buildId: string): ActiveBuild | undefined {
  return activeBuilds.get(buildId);
}

export function getAllActiveBuilds(): ActiveBuild[] {
  return Array.from(activeBuilds.values());
}

export function cancelBuild(buildId: string): boolean {
  const build = activeBuilds.get(buildId);
  if (!build || build.status !== "in_progress") return false;
  build.cancelRequested = true;
  return true;
}

async function logExecution(
  buildId: string,
  projectId: string,
  taskId: string | null,
  agentType: string,
  action: string,
  status: string,
  details?: Record<string, unknown>,
  tokensUsed?: number,
  durationMs?: number
) {
  await db.insert(executionLogsTable).values({
    buildId,
    projectId,
    taskId,
    agentType,
    action,
    status,
    details: details ?? null,
    tokensUsed: tokensUsed ?? 0,
    durationMs: durationMs ?? null,
  });
}

async function recordTokenUsage(
  userId: string,
  projectId: string,
  buildId: string,
  agentType: string,
  model: string,
  tokensUsed: number,
  costUsd: number
) {
  const INPUT_RATIO = 0.3;
  const tokensInput = Math.floor(tokensUsed * INPUT_RATIO);
  const tokensOutput = tokensUsed - tokensInput;

  await db.insert(tokenUsageTable).values({
    userId,
    projectId,
    buildId,
    agentType,
    model,
    tokensInput,
    tokensOutput,
    costUsd: costUsd.toFixed(6),
    usageDate: new Date().toISOString().split("T")[0],
  });

  await checkAndNotifyLimits(userId, projectId, costUsd).catch((err) =>
    console.error("Failed to check/notify limits:", err)
  );
}

function estimateCost(tokensUsed: number, model: string): number {
  if (model.startsWith("claude-sonnet")) {
    return tokensUsed * 0.000015;
  }
  if (model === "o1") {
    return tokensUsed * 0.00006;
  }
  return tokensUsed * 0.00003;
}

async function createTask(
  buildId: string,
  projectId: string,
  agentType: string,
  prompt?: string
): Promise<string> {
  const [task] = await db
    .insert(buildTasksTable)
    .values({ buildId, projectId, agentType, status: "in_progress", prompt })
    .returning({ id: buildTasksTable.id });
  return task.id;
}

async function completeTask(
  taskId: string,
  tokensUsed: number,
  costUsd: number,
  durationMs: number
) {
  await db
    .update(buildTasksTable)
    .set({
      status: "completed",
      tokensUsed,
      costUsd: costUsd.toFixed(6),
      durationMs,
      completedAt: new Date(),
    })
    .where(eq(buildTasksTable.id, taskId));
}

async function failTask(taskId: string, errorMessage: string, durationMs: number) {
  await db
    .update(buildTasksTable)
    .set({
      status: "failed",
      errorMessage,
      durationMs,
      completedAt: new Date(),
    })
    .where(eq(buildTasksTable.id, taskId));
}

export async function checkBuildLimits(
  userId: string,
  projectId: string
): Promise<{ allowed: boolean; reason?: string; reasonAr?: string }> {
  const limits = await checkSpendingLimits(userId, projectId);
  return { allowed: limits.allowed, reason: limits.reason, reasonAr: limits.reasonAr };
}

export async function startBuild(
  projectId: string,
  userId: string,
  prompt: string
): Promise<string> {
  const buildId = uuidv4();
  const constitution = getConstitution();

  const activeBuild: ActiveBuild = {
    buildId,
    projectId,
    userId,
    status: "pending",
    cancelRequested: false,
  };
  activeBuilds.set(buildId, activeBuild);

  await db
    .update(projectsTable)
    .set({ status: "building", prompt, updatedAt: new Date() })
    .where(eq(projectsTable.id, projectId));

  executeBuildPipeline(buildId, projectId, userId, prompt, constitution).catch(
    (err) => {
      console.error(`Build ${buildId} pipeline error:`, err);
    }
  );

  return buildId;
}

export async function startBuildWithPlan(
  projectId: string,
  userId: string,
  prompt: string,
  plan: ProjectPlan
): Promise<string> {
  const buildId = uuidv4();
  const constitution = getConstitution();

  const activeBuild: ActiveBuild = {
    buildId,
    projectId,
    userId,
    status: "pending",
    cancelRequested: false,
  };
  activeBuilds.set(buildId, activeBuild);

  await db
    .update(projectsTable)
    .set({ status: "building", prompt, updatedAt: new Date() })
    .where(eq(projectsTable.id, projectId));

  executeBuildPipelineWithPlan(buildId, projectId, userId, prompt, plan, constitution).catch(
    (err) => {
      console.error(`Build ${buildId} (with plan) pipeline error:`, err);
    }
  );

  return buildId;
}

export async function generatePlan(
  projectId: string,
  userId: string,
  prompt: string
): Promise<{ buildId: string; plan: ProjectPlan; tokensUsed: number }> {
  const buildId = uuidv4();
  const constitution = getConstitution();

  const plannerAgent = new PlannerAgent(constitution);
  const context: BuildContext = {
    buildId,
    projectId,
    userId,
    prompt,
    existingFiles: [],
    tokensUsedSoFar: 0,
  };

  const result = await plannerAgent.execute(context);
  if (!result.success) {
    throw new Error(result.error || "Planning failed");
  }

  const plan = result.data?.plan as ProjectPlan;
  if (!plan) {
    throw new Error("Planner produced no plan");
  }

  await logExecution(buildId, projectId, null, "planner", "generate_plan", "completed", {
    plan,
    tokensUsed: result.tokensUsed,
  }, result.tokensUsed, result.durationMs);

  await recordTokenUsage(userId, projectId, buildId, "planner", plannerAgent.modelConfig.model, result.tokensUsed, estimateCost(result.tokensUsed, plannerAgent.modelConfig.model));

  return { buildId, plan, tokensUsed: result.tokensUsed };
}

function detectLang(text: string): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

async function executeBuildPipeline(
  buildId: string,
  projectId: string,
  userId: string,
  prompt: string,
  constitution: ReturnType<typeof getConstitution>
) {
  const build = activeBuilds.get(buildId)!;
  build.status = "in_progress";
  const lang = detectLang(prompt);

  if (!prompt.includes("[FORCE_SINGLE_SHOT]") && shouldUseBatchedBuild(prompt, 0)) {
    console.log(`Build ${buildId}: detected large project, switching to batched build mode`);
    await executeBatchedBuildPipeline(buildId, projectId, userId, prompt, constitution);
    return;
  }
  const cleanPrompt = prompt.replace("[FORCE_SINGLE_SHOT]", "").trim();

  const codegenAgent = new CodeGenAgent(constitution);
  const reviewerAgent = new ReviewerAgent(constitution);
  const fixerAgent = new FixerAgent(constitution);
  const fileManager = new FileManagerAgent(constitution);
  const surgicalEditAgent = new SurgicalEditAgent(constitution);

  await Promise.allSettled([
    codegenAgent.loadConfigFromDB(),
    reviewerAgent.loadConfigFromDB(),
    fixerAgent.loadConfigFromDB(),
    surgicalEditAgent.loadConfigFromDB(),
  ]);

  let totalTokens = 0;
  let totalCost = 0;

  try {
    await logExecution(buildId, projectId, null, "system", "build_started", "in_progress", {
      prompt,
      message: lang === "ar" ? `بدأ بناء المشروع — "${prompt.slice(0, 80)}"` : `Build started — "${prompt.slice(0, 80)}"`,
    });

    await logExecution(buildId, projectId, null, "system", "analyzing_request", "in_progress", {
      message: lang === "ar" ? "أحلل طلبك وأحدد نوع المشروع والتقنيات المطلوبة..." : "Analyzing your request and determining project type and required technologies...",
    });

    const limitCheck = await checkSpendingLimits(userId, projectId);
    if (!limitCheck.allowed) {
      await logExecution(buildId, projectId, null, "system", "limit_exceeded", "failed", {
        reason: limitCheck.reason,
        message: lang === "ar" ? "تجاوز حد الاستخدام — لا يمكن المتابعة" : "Usage limit exceeded — cannot proceed",
      });
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    if (build.cancelRequested) {
      await logExecution(buildId, projectId, null, "system", "build_cancelled", "failed", {
        message: lang === "ar" ? "تم إلغاء البناء بناءً على طلبك" : "Build cancelled by user request",
      });
      await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
      return;
    }

    const existingFiles = await fileManager.getProjectFiles(projectId);
    const context: BuildContext = {
      buildId,
      projectId,
      userId,
      prompt,
      existingFiles,
      tokensUsedSoFar: 0,
    };

    const isSurgicalEdit = isModificationRequest(prompt, existingFiles.length > 0);

    if (isSurgicalEdit) {
      const surgicalTaskId = await createTask(buildId, projectId, "surgical_edit", prompt);
      await logExecution(buildId, projectId, surgicalTaskId, "surgical_edit", "analyzing_changes", "in_progress", {
        existingFileCount: existingFiles.length,
        message: lang === "ar" ? `أحلل ${existingFiles.length} ملف موجود وأحدد التعديلات المطلوبة...` : `Analyzing ${existingFiles.length} existing files to determine required changes...`,
      });

      const surgicalResult = await surgicalEditAgent.execute(context);
      totalTokens += surgicalResult.tokensUsed;
      const surgicalCost = estimateCost(surgicalResult.tokensUsed, surgicalEditAgent.modelConfig.model);
      totalCost += surgicalCost;

      await recordTokenUsage(userId, projectId, buildId, "surgical_edit", surgicalEditAgent.modelConfig.model, surgicalResult.tokensUsed, surgicalCost);

      if (surgicalResult.success) {
        await completeTask(surgicalTaskId, surgicalResult.tokensUsed, surgicalCost, surgicalResult.durationMs);
        await logExecution(
          buildId, projectId, surgicalTaskId, "surgical_edit", "surgical_edit", "completed",
          { tokensUsed: surgicalResult.tokensUsed, summary: surgicalResult.data?.summary },
          surgicalResult.tokensUsed, surgicalResult.durationMs
        );

        const patchedFiles = surgicalResult.data?.files as GeneratedFile[];
        const allFiles = mergeFiles(existingFiles, patchedFiles);

        await savePatchedFilesAndRun(
          buildId, projectId, userId, allFiles, fileManager, constitution,
          totalTokens, totalCost, build
        );
        return;
      }

      await failTask(surgicalTaskId, surgicalResult.error ?? "Unknown error", surgicalResult.durationMs);
      await logExecution(
        buildId, projectId, surgicalTaskId, "surgical_edit", "surgical_edit", "failed",
        {
          tokensUsed: surgicalResult.tokensUsed,
          error: surgicalResult.error,
          requiresFullRegeneration: surgicalResult.data?.requiresFullRegeneration,
        },
        surgicalResult.tokensUsed, surgicalResult.durationMs
      );

      console.log(`Build ${buildId}: surgical edit failed, falling back to full codegen. Reason: ${surgicalResult.error}`);
      await logExecution(buildId, projectId, null, "system", "surgical_fallback_to_codegen", "in_progress", {
        reason: surgicalResult.error,
      });

      context.tokensUsedSoFar = totalTokens;
    }

    const codegenTaskId = await createTask(buildId, projectId, "codegen", prompt);
    await logExecution(buildId, projectId, codegenTaskId, "codegen", "generate_code", "in_progress", {
      message: lang === "ar"
        ? "أبدأ الآن بكتابة الكود... أحلل البنية المطلوبة وأحدد الملفات والمكونات"
        : "Starting code generation... analyzing required structure, files, and components",
    });

    const codegenResult = await codegenAgent.execute(context);
    totalTokens += codegenResult.tokensUsed;
    const codegenCost = estimateCost(codegenResult.tokensUsed, codegenAgent.modelConfig.model);
    totalCost += codegenCost;

    await recordTokenUsage(userId, projectId, buildId, "codegen", codegenAgent.modelConfig.model, codegenResult.tokensUsed, codegenCost);

    if (codegenResult.success) {
      await completeTask(codegenTaskId, codegenResult.tokensUsed, codegenCost, codegenResult.durationMs);
    } else {
      await failTask(codegenTaskId, codegenResult.error ?? "Unknown error", codegenResult.durationMs);
    }

    {
      const _genFiles = (codegenResult.data?.files as GeneratedFile[]) || [];
      const _genNames = _genFiles.map(f => f.filePath);
      const _genDur = Math.round((codegenResult.durationMs || 0) / 1000);
      await logExecution(
        buildId, projectId, codegenTaskId, "codegen", "generate_code",
        codegenResult.success ? "completed" : "failed",
        {
          tokensUsed: codegenResult.tokensUsed, error: codegenResult.error,
          fileCount: _genNames.length, files: _genNames.slice(0, 25),
          message: codegenResult.success
            ? (lang === "ar" ? `تم توليد ${_genNames.length} ملف في ${_genDur} ثانية:\n${_genNames.map(f => `  📄 ${f}`).join("\n")}` : `Generated ${_genNames.length} files in ${_genDur}s:\n${_genNames.map(f => `  📄 ${f}`).join("\n")}`)
            : (lang === "ar" ? `فشل توليد الكود: ${codegenResult.error}` : `Code generation failed: ${codegenResult.error}`),
        },
        codegenResult.tokensUsed, codegenResult.durationMs
      );
    }

    if (!codegenResult.success) {
      console.error(`Build ${buildId} codegen failed:`, codegenResult.error);
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    const postCodegenLimit = await checkSpendingLimits(userId, projectId);
    if (!postCodegenLimit.allowed) {
      await logExecution(buildId, projectId, null, "system", "limit_exceeded_mid_build", "failed", {
        reason: postCodegenLimit.reason,
        after_agent: "codegen",
      });
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    let generatedFiles = codegenResult.data?.files as GeneratedFile[];
    context.tokensUsedSoFar = totalTokens;
    context.existingFiles = generatedFiles.map((f) => ({
      filePath: f.filePath,
      content: f.content,
    }));

    if (build.cancelRequested) {
      await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
      return;
    }

    const reviewTaskId = await createTask(buildId, projectId, "reviewer");
    await logExecution(buildId, projectId, reviewTaskId, "reviewer", "review_code", "in_progress", {
      message: lang === "ar"
        ? "أراجع الكود المُولَّد... أبحث عن أخطاء، مشاكل أمنية، وأفضل الممارسات"
        : "Reviewing generated code... checking for errors, security issues, and best practices",
    });

    const reviewResult = await reviewerAgent.execute(context);
    totalTokens += reviewResult.tokensUsed;
    const reviewCost = estimateCost(reviewResult.tokensUsed, reviewerAgent.modelConfig.model);
    totalCost += reviewCost;

    await recordTokenUsage(userId, projectId, buildId, "reviewer", reviewerAgent.modelConfig.model, reviewResult.tokensUsed, reviewCost);

    if (reviewResult.success) {
      await completeTask(reviewTaskId, reviewResult.tokensUsed, reviewCost, reviewResult.durationMs);
    } else {
      await failTask(reviewTaskId, reviewResult.error ?? "Unknown error", reviewResult.durationMs);
    }

    await logExecution(
      buildId, projectId, reviewTaskId, "reviewer", "review_code",
      reviewResult.success ? "completed" : "failed",
      reviewResult.data,
      reviewResult.tokensUsed,
      reviewResult.durationMs
    );

    if (!reviewResult.success) {
      console.error(`Build ${buildId} review failed:`, reviewResult.error);
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    const postReviewLimit = await checkSpendingLimits(userId, projectId);
    if (!postReviewLimit.allowed) {
      await logExecution(buildId, projectId, null, "system", "limit_exceeded_mid_build", "failed", {
        reason: postReviewLimit.reason,
        after_agent: "reviewer",
      });
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    const review = reviewResult.data?.review as
      | { approved: boolean; issues: CodeIssue[] }
      | undefined;

    if (review && !review.approved && review.issues.length > 0) {
      if (build.cancelRequested) {
        await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
        return;
      }

      const errorIssues = review.issues.filter((i) => i.severity === "error");
      if (errorIssues.length === 0) {
        console.log(`Build ${buildId}: review had warnings/info only, proceeding without fix`);
      } else {
        const fixTaskId = await createTask(buildId, projectId, "fixer");
        await logExecution(buildId, projectId, fixTaskId, "fixer", "fix_code", "in_progress", {
          issueCount: errorIssues.length,
          message: lang === "ar"
            ? `وجدت ${errorIssues.length} خطأ — أصلحها الآن:\n${errorIssues.slice(0, 5).map(i => `  🔧 ${i.file || ''}: ${i.message}`).join("\n")}`
            : `Found ${errorIssues.length} error(s) — fixing now:\n${errorIssues.slice(0, 5).map(i => `  🔧 ${i.file || ''}: ${i.message}`).join("\n")}`,
        });

        context.tokensUsedSoFar = totalTokens;
        const fixResult = await fixerAgent.executeWithIssues(context, errorIssues);
        totalTokens += fixResult.tokensUsed;
        const fixCost = estimateCost(fixResult.tokensUsed, fixerAgent.modelConfig.model);
        totalCost += fixCost;

        await recordTokenUsage(userId, projectId, buildId, "fixer", fixerAgent.modelConfig.model, fixResult.tokensUsed, fixCost);

        if (fixResult.success) {
          await completeTask(fixTaskId, fixResult.tokensUsed, fixCost, fixResult.durationMs);
        } else {
          await failTask(fixTaskId, fixResult.error ?? "Unknown error", fixResult.durationMs);
        }

        await logExecution(
          buildId, projectId, fixTaskId, "fixer", "fix_code",
          fixResult.success ? "completed" : "failed",
          { tokensUsed: fixResult.tokensUsed },
          fixResult.tokensUsed,
          fixResult.durationMs
        );

        if (!fixResult.success) {
          console.error(`Build ${buildId} fixer failed:`, fixResult.error);
          await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
          return;
        }

        const postFixerLimit = await checkSpendingLimits(userId, projectId);
        if (!postFixerLimit.allowed) {
          await logExecution(buildId, projectId, null, "system", "limit_exceeded_mid_build", "failed", {
            reason: postFixerLimit.reason,
            after_agent: "fixer",
          });
          await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
          return;
        }

        if (fixResult.data?.files) {
          const fixedFiles = fixResult.data.files as GeneratedFile[];
          const fixedMap = new Map(fixedFiles.map(f => [f.filePath, f]));
          generatedFiles = generatedFiles.map(f => fixedMap.get(f.filePath) || f);
          for (const ff of fixedFiles) {
            if (!generatedFiles.some(g => g.filePath === ff.filePath)) {
              generatedFiles.push(ff);
            }
          }
        }
      }
    }

    if (build.cancelRequested) {
      await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
      return;
    }

    const generatedDirectories = codegenResult.data?.directories as string[] | undefined;

    const saveTaskId = await createTask(buildId, projectId, "filemanager");
    const _fileNames = generatedFiles.map(f => f.filePath);
    await logExecution(buildId, projectId, saveTaskId, "filemanager", "save_files", "in_progress", {
      fileCount: generatedFiles.length,
      directoryCount: generatedDirectories?.length ?? 0,
      message: lang === "ar"
        ? `أحفظ ${generatedFiles.length} ملف في المشروع:\n${_fileNames.slice(0, 10).map(f => `  💾 ${f}`).join("\n")}${_fileNames.length > 10 ? `\n  ... و ${_fileNames.length - 10} ملف آخر` : ""}`
        : `Saving ${generatedFiles.length} files to project:\n${_fileNames.slice(0, 10).map(f => `  💾 ${f}`).join("\n")}${_fileNames.length > 10 ? `\n  ... and ${_fileNames.length - 10} more` : ""}`,
    });

    const saveResult = await fileManager.saveFiles(projectId, generatedFiles, generatedDirectories);

    if (saveResult.success) {
      await completeTask(saveTaskId, 0, 0, saveResult.durationMs);
    } else {
      await failTask(saveTaskId, "Failed to save some files", saveResult.durationMs);
    }

    await logExecution(
      buildId, projectId, saveTaskId, "filemanager", "save_files",
      saveResult.success ? "completed" : "failed",
      {
        ...saveResult.data as Record<string, unknown>,
        message: saveResult.success
          ? (lang === "ar" ? `تم حفظ ${generatedFiles.length} ملف بنجاح` : `Successfully saved ${generatedFiles.length} files`)
          : (lang === "ar" ? "فشل حفظ بعض الملفات" : "Failed to save some files"),
      },
      0,
      saveResult.durationMs
    );

    if (saveResult.success) {
      if (build.cancelRequested) {
        await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
        return;
      }

      const runnerTaskId = await createTask(buildId, projectId, "package_runner");
      await logExecution(buildId, projectId, runnerTaskId, "package_runner", "install_and_run", "in_progress", {
        fileCount: generatedFiles.length,
      });

      const runnerStartTime = Date.now();
      const packageRunner = new PackageRunnerAgent(constitution);
      setRunner(buildId, packageRunner);

      const outputLogs: { type: string; message: string; timestamp: string }[] = [];
      packageRunner.onOutput((output) => {
        outputLogs.push(output);
      });

      try {
        const runnerResult = await packageRunner.executeWithFiles(projectId, generatedFiles);
        const runnerDuration = Date.now() - runnerStartTime;

        if (runnerResult.success) {
          await completeTask(runnerTaskId, 0, 0, runnerDuration);
        } else {
          await failTask(runnerTaskId, runnerResult.error ?? "Package runner failed", runnerDuration);
        }

        await logExecution(
          buildId, projectId, runnerTaskId, "package_runner", "install_and_run",
          runnerResult.success ? "completed" : "failed",
          {
            ...runnerResult.data,
            outputLogCount: outputLogs.length,
            lastOutput: outputLogs.slice(-5).map((l) => l.message).join("\n"),
          },
          0,
          runnerDuration
        );

        if (!runnerResult.success) {
          console.error(`Build ${buildId} package runner failed:`, runnerResult.error);
        }
      } catch (runnerError) {
        const runnerDuration = Date.now() - runnerStartTime;
        const errMsg = runnerError instanceof Error ? runnerError.message : String(runnerError);
        await failTask(runnerTaskId, errMsg, runnerDuration);
        await logExecution(buildId, projectId, runnerTaskId, "package_runner", "install_and_run", "failed", {
          error: errMsg,
        }, 0, runnerDuration);
        console.error(`Build ${buildId} package runner error:`, runnerError);
      }

      try {
        await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "in_progress");
        const qaReportId = await runQaWithRetry(buildId, projectId, userId);
        await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "completed", { qaReportId });
      } catch (qaError) {
        console.error(`Build ${buildId} QA pipeline error:`, qaError);
        await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "failed", {
          error: qaError instanceof Error ? qaError.message : String(qaError),
        });
      }
    }

    const finalStatus = !saveResult.success ? "failed" : "completed";
    await finalizeBuild(buildId, projectId, finalStatus, totalTokens, totalCost);
  } catch (error) {
    console.error(`Build ${buildId} error:`, error);
    await logExecution(buildId, projectId, null, "system", "build_error", "failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
  }
}

const BATCH_SIZE = 10;
const BATCHED_BUILD_THRESHOLD = 15;

function shouldUseBatchedBuild(prompt: string, existingFileCount: number): boolean {
  if (existingFileCount > 0) return false;
  const lower = prompt.toLowerCase();
  const bigProjectKeywords = [
    "مزاد", "منصة", "platform", "marketplace", "سوق",
    "dashboard", "لوحة", "نظام", "system", "crm", "erp",
    "e-commerce", "ecommerce", "متجر", "shop",
    "social", "اجتماعي", "chat", "دردشة",
    "booking", "حجز", "real-time",
    "500", "كبير", "large", "complex", "معقد",
    "عديد", "many pages", "multi",
  ];
  const score = bigProjectKeywords.filter(k => lower.includes(k)).length;
  const wordCount = prompt.split(/\s+/).length;
  return score >= 2 || wordCount > 100;
}

async function planFilesForBatch(
  prompt: string,
  constitution: ReturnType<typeof getConstitution>
): Promise<{ framework: string; files: string[]; packages: string[]; directories: string[] }> {
  const plannerAgent = new PlannerAgent(constitution);
  const context: BuildContext = {
    buildId: "plan-only",
    projectId: "plan-only",
    userId: "plan-only",
    prompt,
    existingFiles: [],
    tokensUsedSoFar: 0,
  };

  const result = await plannerAgent.execute(context);
  if (!result.success || !result.data?.plan) {
    throw new Error(result.error || "Planning failed");
  }

  const plan = result.data.plan as ProjectPlan;
  return {
    framework: plan.framework,
    files: plan.files,
    packages: plan.packages,
    directories: plan.directoryStructure,
  };
}

function splitIntoBatches(files: string[], batchSize: number): string[][] {
  const configFiles: string[] = [];
  const coreFiles: string[] = [];
  const componentFiles: string[] = [];
  const pageFiles: string[] = [];
  const otherFiles: string[] = [];

  for (const f of files) {
    const lower = f.toLowerCase();
    if (lower.includes("package.json") || lower.includes("tsconfig") || lower.includes("vite.config") ||
        lower.includes("tailwind") || lower.includes("postcss") || lower.includes("index.html") ||
        lower.includes("requirements.txt") || lower.includes("main.py") || lower.includes(".env")) {
      configFiles.push(f);
    } else if (lower.includes("app.tsx") || lower.includes("app.jsx") || lower.includes("app.css") ||
               lower.includes("index.tsx") || lower.includes("index.jsx") || lower.includes("index.css") ||
               lower.includes("main.tsx") || lower.includes("layout") || lower.includes("router") ||
               lower.includes("context") || lower.includes("provider") || lower.includes("types")) {
      coreFiles.push(f);
    } else if (lower.includes("/components/") || lower.includes("/component/")) {
      componentFiles.push(f);
    } else if (lower.includes("/pages/") || lower.includes("/page/") || lower.includes("/views/") ||
               lower.includes("/routes/") || lower.includes("/screens/")) {
      pageFiles.push(f);
    } else {
      otherFiles.push(f);
    }
  }

  const batches: string[][] = [];

  if (configFiles.length > 0 || coreFiles.length > 0) {
    batches.push([...configFiles, ...coreFiles]);
  }

  const remaining = [...componentFiles, ...pageFiles, ...otherFiles];
  for (let i = 0; i < remaining.length; i += batchSize) {
    batches.push(remaining.slice(i, i + batchSize));
  }

  return batches;
}

async function executeBatchedBuildPipeline(
  buildId: string,
  projectId: string,
  userId: string,
  prompt: string,
  constitution: ReturnType<typeof getConstitution>
) {
  const build = activeBuilds.get(buildId)!;
  build.status = "in_progress";
  const lang = detectLang(prompt);

  const codegenAgent = new CodeGenAgent(constitution);
  const fileManager = new FileManagerAgent(constitution);

  let totalTokens = 0;
  let totalCost = 0;

  try {
    await logExecution(buildId, projectId, null, "system", "build_started", "in_progress", {
      prompt, mode: "batched",
      message: lang === "ar"
        ? `بدأ بناء المشروع بنظام الدفعات — "${prompt.slice(0, 80)}"`
        : `Build started (batched mode) — "${prompt.slice(0, 80)}"`,
    });

    const limitCheck = await checkSpendingLimits(userId, projectId);
    if (!limitCheck.allowed) {
      await logExecution(buildId, projectId, null, "system", "limit_exceeded", "failed", { reason: limitCheck.reason });
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    await logExecution(buildId, projectId, null, "planner", "planning_batches", "in_progress", {
      message: lang === "ar"
        ? "أخطط بنية المشروع وأقسّم الملفات لدفعات..."
        : "Planning project structure and splitting files into batches...",
    });

    let filePlan: { framework: string; files: string[]; packages: string[]; directories: string[] };
    try {
      filePlan = await planFilesForBatch(prompt, constitution);
    } catch (planErr) {
      console.error(`Build ${buildId} planning failed, falling back to single-shot:`, planErr);
      await logExecution(buildId, projectId, null, "planner", "planning_batches", "failed", {
        error: planErr instanceof Error ? planErr.message : String(planErr),
        message: lang === "ar" ? "فشل التخطيط — أرجع للتوليد العادي" : "Planning failed — falling back to normal generation",
      });
      activeBuilds.delete(buildId);
      const newBuild: ActiveBuild = { buildId, projectId, userId, status: "in_progress", cancelRequested: false };
      activeBuilds.set(buildId, newBuild);
      await executeBuildPipeline(buildId, projectId, userId, prompt + "\n[FORCE_SINGLE_SHOT]", constitution);
      return;
    }

    const batches = splitIntoBatches(filePlan.files, BATCH_SIZE);
    const totalBatches = batches.length;
    const totalPlannedFiles = filePlan.files.length;

    await logExecution(buildId, projectId, null, "planner", "planning_batches", "completed", {
      framework: filePlan.framework,
      totalFiles: totalPlannedFiles,
      totalBatches,
      batchSizes: batches.map(b => b.length),
      message: lang === "ar"
        ? `خطة المشروع: ${totalPlannedFiles} ملف في ${totalBatches} دفعات (${filePlan.framework})`
        : `Project plan: ${totalPlannedFiles} files in ${totalBatches} batches (${filePlan.framework})`,
    });

    const allGeneratedFiles: GeneratedFile[] = [];
    let allDeps: Record<string, string> = {};
    let allDevDeps: Record<string, string> = {};
    let allScripts: Record<string, string> = {};

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      if (build.cancelRequested) {
        await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
        return;
      }

      const batchSpendCheck = await checkSpendingLimits(userId, projectId);
      if (!batchSpendCheck.allowed) {
        await logExecution(buildId, projectId, null, "system", "limit_exceeded_mid_build", "failed", {
          reason: batchSpendCheck.reason, batch: batchIdx + 1,
        });
        if (allGeneratedFiles.length > 0) {
          await finalizeBuild(buildId, projectId, "completed", totalTokens, totalCost);
        } else {
          await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
        }
        return;
      }

      const batch = batches[batchIdx];
      const batchTaskId = await createTask(buildId, projectId, "codegen", `Batch ${batchIdx + 1}/${totalBatches}`);

      await logExecution(buildId, projectId, batchTaskId, "codegen", "generate_batch", "in_progress", {
        batchIndex: batchIdx + 1,
        totalBatches,
        files: batch,
        message: lang === "ar"
          ? `الدفعة ${batchIdx + 1}/${totalBatches}: أولّد ${batch.length} ملف...\n${batch.map(f => `  📝 ${f}`).join("\n")}`
          : `Batch ${batchIdx + 1}/${totalBatches}: generating ${batch.length} files...\n${batch.map(f => `  📝 ${f}`).join("\n")}`,
      });

      const context: BuildContext = {
        buildId,
        projectId,
        userId,
        prompt,
        existingFiles: allGeneratedFiles.map(f => ({ filePath: f.filePath, content: f.content })),
        tokensUsedSoFar: totalTokens,
        framework: filePlan.framework as any,
      };

      const batchResult = await codegenAgent.executeBatch(context, batch, batchIdx, totalBatches, allGeneratedFiles);
      totalTokens += batchResult.tokensUsed;
      const batchCost = estimateCost(batchResult.tokensUsed, codegenAgent.modelConfig.model);
      totalCost += batchCost;

      await recordTokenUsage(userId, projectId, buildId, "codegen", codegenAgent.modelConfig.model, batchResult.tokensUsed, batchCost);

      if (!batchResult.success) {
        await failTask(batchTaskId, batchResult.error ?? "Batch generation failed", batchResult.durationMs);
        await logExecution(buildId, projectId, batchTaskId, "codegen", "generate_batch", "failed", {
          batchIndex: batchIdx + 1, error: batchResult.error,
          message: lang === "ar"
            ? `فشلت الدفعة ${batchIdx + 1}: ${batchResult.error}`
            : `Batch ${batchIdx + 1} failed: ${batchResult.error}`,
        }, batchResult.tokensUsed, batchResult.durationMs);

        if (allGeneratedFiles.length > 0) {
          console.log(`Build ${buildId}: batch ${batchIdx + 1} failed but ${allGeneratedFiles.length} files already generated, finalizing partial build`);
          break;
        }
        await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
        return;
      }

      const batchFiles = (batchResult.data?.files as GeneratedFile[]) || [];
      await completeTask(batchTaskId, batchResult.tokensUsed, batchCost, batchResult.durationMs);

      const batchFileNames = batchFiles.map(f => f.filePath);
      await logExecution(buildId, projectId, batchTaskId, "codegen", "generate_batch", "completed", {
        batchIndex: batchIdx + 1,
        totalBatches,
        fileCount: batchFiles.length,
        files: batchFileNames,
        message: lang === "ar"
          ? `الدفعة ${batchIdx + 1}/${totalBatches}: تم توليد ${batchFiles.length} ملف ✓\n${batchFileNames.map(f => `  ✅ ${f}`).join("\n")}`
          : `Batch ${batchIdx + 1}/${totalBatches}: generated ${batchFiles.length} files ✓\n${batchFileNames.map(f => `  ✅ ${f}`).join("\n")}`,
      }, batchResult.tokensUsed, batchResult.durationMs);

      for (const f of batchFiles) {
        const existIdx = allGeneratedFiles.findIndex(g => g.filePath === f.filePath);
        if (existIdx >= 0) {
          allGeneratedFiles[existIdx] = f;
        } else {
          allGeneratedFiles.push(f);
        }
      }

      if (batchResult.data?.dependencies) Object.assign(allDeps, batchResult.data.dependencies as Record<string, string>);
      if (batchResult.data?.devDependencies) Object.assign(allDevDeps, batchResult.data.devDependencies as Record<string, string>);
      if (batchResult.data?.scripts) Object.assign(allScripts, batchResult.data.scripts as Record<string, string>);

      await logExecution(buildId, projectId, null, "filemanager", "save_batch", "in_progress", {
        batchIndex: batchIdx + 1,
        fileCount: batchFiles.length,
        message: lang === "ar"
          ? `أحفظ ملفات الدفعة ${batchIdx + 1}...`
          : `Saving batch ${batchIdx + 1} files...`,
      });

      const batchSaveResult = await fileManager.saveFiles(projectId, allGeneratedFiles);
      await logExecution(buildId, projectId, null, "filemanager", "save_batch",
        batchSaveResult.success ? "completed" : "failed", {
          batchIndex: batchIdx + 1,
          totalFilesSoFar: allGeneratedFiles.length,
          message: batchSaveResult.success
            ? (lang === "ar"
              ? `تم حفظ الدفعة ${batchIdx + 1} — ${allGeneratedFiles.length} ملف محفوظ حتى الآن`
              : `Batch ${batchIdx + 1} saved — ${allGeneratedFiles.length} files saved so far`)
            : (lang === "ar" ? "فشل حفظ الملفات" : "Failed to save files"),
        }, 0, batchSaveResult.durationMs
      );
    }

    if (allGeneratedFiles.length === 0) {
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    const { getProjectTemplate } = await import("./project-templates");
    const framework = (filePlan.framework || "react-vite") as any;
    const template = getProjectTemplate(framework);

    const mergedDeps = { ...template.dependencies, ...allDeps };
    const mergedDevDeps = { ...template.devDependencies, ...allDevDeps };
    const mergedScripts = { ...template.scripts, ...allScripts };

    if (framework !== "fastapi") {
      const packageJson: GeneratedFile = {
        filePath: "package.json",
        content: JSON.stringify({
          name: "generated-project",
          version: "1.0.0",
          private: true,
          scripts: mergedScripts,
          dependencies: mergedDeps,
          devDependencies: mergedDevDeps,
        }, null, 2),
        fileType: "json",
      };
      const pkgIdx = allGeneratedFiles.findIndex(f => f.filePath === "package.json");
      if (pkgIdx >= 0) allGeneratedFiles[pkgIdx] = packageJson;
      else allGeneratedFiles.push(packageJson);
    }

    for (const tf of template.baseFiles) {
      if (!allGeneratedFiles.some(f => f.filePath === tf.filePath)) {
        allGeneratedFiles.push(tf);
      }
    }

    await logExecution(buildId, projectId, null, "filemanager", "save_files", "in_progress", {
      fileCount: allGeneratedFiles.length,
      message: lang === "ar"
        ? `أحفظ جميع الملفات النهائية (${allGeneratedFiles.length} ملف)...`
        : `Saving all final files (${allGeneratedFiles.length} files)...`,
    });

    const finalSave = await fileManager.saveFiles(projectId, allGeneratedFiles);
    await logExecution(buildId, projectId, null, "filemanager", "save_files",
      finalSave.success ? "completed" : "failed", {
        fileCount: allGeneratedFiles.length,
        message: finalSave.success
          ? (lang === "ar" ? `تم حفظ ${allGeneratedFiles.length} ملف بنجاح` : `Successfully saved ${allGeneratedFiles.length} files`)
          : (lang === "ar" ? "فشل حفظ الملفات" : "Failed to save files"),
      }, 0, finalSave.durationMs
    );

    if (finalSave.success && !build.cancelRequested) {
      const runnerTaskId = await createTask(buildId, projectId, "package_runner");
      await logExecution(buildId, projectId, runnerTaskId, "package_runner", "install_and_run", "in_progress", {
        fileCount: allGeneratedFiles.length,
        message: lang === "ar"
          ? `أثبّت الحزم وأشغّل المشروع (${allGeneratedFiles.length} ملف)...`
          : `Installing packages and running project (${allGeneratedFiles.length} files)...`,
      });

      const runnerStartTime = Date.now();
      const packageRunner = new PackageRunnerAgent(constitution);
      setRunner(buildId, packageRunner);

      try {
        const runnerResult = await packageRunner.executeWithFiles(projectId, allGeneratedFiles);
        const runnerDuration = Date.now() - runnerStartTime;

        if (runnerResult.success) {
          await completeTask(runnerTaskId, 0, 0, runnerDuration);
        } else {
          await failTask(runnerTaskId, runnerResult.error ?? "Package runner failed", runnerDuration);
        }

        await logExecution(buildId, projectId, runnerTaskId, "package_runner", "install_and_run",
          runnerResult.success ? "completed" : "failed", runnerResult.data, 0, runnerDuration);
      } catch (runnerError) {
        const runnerDuration = Date.now() - runnerStartTime;
        const errMsg = runnerError instanceof Error ? runnerError.message : String(runnerError);
        await failTask(runnerTaskId, errMsg, runnerDuration);
        await logExecution(buildId, projectId, runnerTaskId, "package_runner", "install_and_run", "failed", { error: errMsg }, 0, runnerDuration);
      }

      try {
        await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "in_progress");
        const qaReportId = await runQaWithRetry(buildId, projectId, userId);
        await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "completed", { qaReportId });
      } catch (qaError) {
        await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "failed", {
          error: qaError instanceof Error ? qaError.message : String(qaError),
        });
      }
    }

    const finalStatus = build.cancelRequested ? "cancelled" : (finalSave.success ? "completed" : "failed");
    await finalizeBuild(buildId, projectId, finalStatus, totalTokens, totalCost);
  } catch (error) {
    console.error(`Build ${buildId} (batched) error:`, error);
    await logExecution(buildId, projectId, null, "system", "build_error", "failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
  }
}

function mergeFiles(
  existingFiles: { filePath: string; content: string }[],
  patchedFiles: GeneratedFile[]
): GeneratedFile[] {
  const fileMap = new Map<string, GeneratedFile>();

  for (const f of existingFiles) {
    fileMap.set(f.filePath, {
      filePath: f.filePath,
      content: f.content,
      fileType: f.filePath.split(".").pop() || "txt",
    });
  }

  for (const f of patchedFiles) {
    fileMap.set(f.filePath, f);
  }

  return Array.from(fileMap.values());
}

async function savePatchedFilesAndRun(
  buildId: string,
  projectId: string,
  userId: string,
  allFiles: GeneratedFile[],
  fileManager: FileManagerAgent,
  constitution: ReturnType<typeof getConstitution>,
  totalTokens: number,
  totalCost: number,
  build: ActiveBuild
) {
  if (build.cancelRequested) {
    await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
    return;
  }

  const saveTaskId = await createTask(buildId, projectId, "filemanager");
  await logExecution(buildId, projectId, saveTaskId, "filemanager", "save_files", "in_progress", {
    fileCount: allFiles.length,
  });

  const saveResult = await fileManager.saveFiles(projectId, allFiles);

  if (saveResult.success) {
    await completeTask(saveTaskId, 0, 0, saveResult.durationMs);
  } else {
    await failTask(saveTaskId, "Failed to save some files", saveResult.durationMs);
  }

  await logExecution(
    buildId, projectId, saveTaskId, "filemanager", "save_files",
    saveResult.success ? "completed" : "failed",
    saveResult.data, 0, saveResult.durationMs
  );

  if (saveResult.success) {
    if (build.cancelRequested) {
      await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
      return;
    }

    const runnerTaskId = await createTask(buildId, projectId, "package_runner");
    await logExecution(buildId, projectId, runnerTaskId, "package_runner", "install_and_run", "in_progress", {
      fileCount: allFiles.length,
    });

    const runnerStartTime = Date.now();
    const packageRunner = new PackageRunnerAgent(constitution);
    setRunner(buildId, packageRunner);

    const outputLogs: { type: string; message: string; timestamp: string }[] = [];
    packageRunner.onOutput((output) => {
      outputLogs.push(output);
    });

    try {
      const runnerResult = await packageRunner.executeWithFiles(projectId, allFiles);
      const runnerDuration = Date.now() - runnerStartTime;

      if (runnerResult.success) {
        await completeTask(runnerTaskId, 0, 0, runnerDuration);
      } else {
        await failTask(runnerTaskId, runnerResult.error ?? "Package runner failed", runnerDuration);
      }

      await logExecution(
        buildId, projectId, runnerTaskId, "package_runner", "install_and_run",
        runnerResult.success ? "completed" : "failed",
        {
          ...runnerResult.data,
          outputLogCount: outputLogs.length,
          lastOutput: outputLogs.slice(-5).map((l) => l.message).join("\n"),
        },
        0, runnerDuration
      );

      if (!runnerResult.success) {
        console.error(`Build ${buildId} package runner failed:`, runnerResult.error);
      }
    } catch (runnerError) {
      const runnerDuration = Date.now() - runnerStartTime;
      const errMsg = runnerError instanceof Error ? runnerError.message : String(runnerError);
      await failTask(runnerTaskId, errMsg, runnerDuration);
      await logExecution(buildId, projectId, runnerTaskId, "package_runner", "install_and_run", "failed", {
        error: errMsg,
      }, 0, runnerDuration);
      console.error(`Build ${buildId} package runner error:`, runnerError);
    }

    try {
      await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "in_progress");
      const qaReportId = await runQaWithRetry(buildId, projectId, userId);
      await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "completed", { qaReportId });
    } catch (qaError) {
      console.error(`Build ${buildId} QA pipeline error:`, qaError);
      await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "failed", {
        error: qaError instanceof Error ? qaError.message : String(qaError),
      });
    }
  }

  const finalStatus = !saveResult.success ? "failed" : "completed";
  await finalizeBuild(buildId, projectId, finalStatus, totalTokens, totalCost);
}

async function executeBuildPipelineWithPlan(
  buildId: string,
  projectId: string,
  userId: string,
  prompt: string,
  plan: ProjectPlan,
  constitution: ReturnType<typeof getConstitution>
) {
  const build = activeBuilds.get(buildId)!;
  build.status = "in_progress";
  const lang = detectLang(prompt);

  const codegenAgent = new CodeGenAgent(constitution);
  const reviewerAgent = new ReviewerAgent(constitution);
  const fixerAgent = new FixerAgent(constitution);
  const fileManager = new FileManagerAgent(constitution);

  let totalTokens = 0;
  let totalCost = 0;

  try {
    await logExecution(buildId, projectId, null, "system", "build_started_with_plan", "in_progress", {
      prompt, plan,
      message: lang === "ar"
        ? `بدأ البناء بخطة من ${plan.steps?.length || 0} خطوات — "${prompt.slice(0, 80)}"`
        : `Build started with ${plan.steps?.length || 0}-step plan — "${prompt.slice(0, 80)}"`,
    });

    const limitCheck = await checkSpendingLimits(userId, projectId);
    if (!limitCheck.allowed) {
      await logExecution(buildId, projectId, null, "system", "limit_exceeded", "failed", { reason: limitCheck.reason });
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    if (build.cancelRequested) {
      await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
      return;
    }

    const existingFiles = await fileManager.getProjectFiles(projectId);

    const planContext = `
Approved Project Plan:
- Framework: ${plan.framework}
- Files to create: ${plan.files.join(", ")}
- Packages: ${plan.packages.join(", ")}
- Directory structure: ${plan.directoryStructure.join(", ")}
- Phases:
${plan.phases.map((p, i) => `  ${i + 1}. ${p.name}: ${p.description}`).join("\n")}

User's original request:
${prompt}`;

    const context: BuildContext = {
      buildId,
      projectId,
      userId,
      prompt: planContext,
      existingFiles,
      tokensUsedSoFar: 0,
      approvedPlan: plan,
    };

    const codegenTaskId = await createTask(buildId, projectId, "codegen", planContext);
    await logExecution(buildId, projectId, codegenTaskId, "codegen", "generate_code", "in_progress");

    const codegenResult = await codegenAgent.execute(context);
    totalTokens += codegenResult.tokensUsed;
    const codegenCost = estimateCost(codegenResult.tokensUsed, codegenAgent.modelConfig.model);
    totalCost += codegenCost;

    await recordTokenUsage(userId, projectId, buildId, "codegen", codegenAgent.modelConfig.model, codegenResult.tokensUsed, codegenCost);

    if (codegenResult.success) {
      await completeTask(codegenTaskId, codegenResult.tokensUsed, codegenCost, codegenResult.durationMs);
    } else {
      await failTask(codegenTaskId, codegenResult.error ?? "Unknown error", codegenResult.durationMs);
    }

    {
      const _genFiles = (codegenResult.data?.files as GeneratedFile[]) || [];
      const _genNames = _genFiles.map(f => f.filePath);
      const _genDur = Math.round((codegenResult.durationMs || 0) / 1000);
      await logExecution(
        buildId, projectId, codegenTaskId, "codegen", "generate_code",
        codegenResult.success ? "completed" : "failed",
        {
          tokensUsed: codegenResult.tokensUsed, error: codegenResult.error,
          fileCount: _genNames.length, files: _genNames.slice(0, 25),
          message: codegenResult.success
            ? (lang === "ar" ? `تم توليد ${_genNames.length} ملف في ${_genDur} ثانية:\n${_genNames.map(f => `  📄 ${f}`).join("\n")}` : `Generated ${_genNames.length} files in ${_genDur}s:\n${_genNames.map(f => `  📄 ${f}`).join("\n")}`)
            : (lang === "ar" ? `فشل توليد الكود: ${codegenResult.error}` : `Code generation failed: ${codegenResult.error}`),
        },
        codegenResult.tokensUsed, codegenResult.durationMs
      );
    }

    if (!codegenResult.success) {
      console.error(`Build ${buildId} codegen failed:`, codegenResult.error);
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    const postCodegenLimit = await checkSpendingLimits(userId, projectId);
    if (!postCodegenLimit.allowed) {
      await logExecution(buildId, projectId, null, "system", "limit_exceeded_mid_build", "failed", {
        reason: postCodegenLimit.reason,
        after_agent: "codegen",
      });
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    let generatedFiles = codegenResult.data?.files as GeneratedFile[];
    context.tokensUsedSoFar = totalTokens;
    context.existingFiles = generatedFiles.map((f) => ({
      filePath: f.filePath,
      content: f.content,
    }));

    if (build.cancelRequested) {
      await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
      return;
    }

    const reviewTaskId = await createTask(buildId, projectId, "reviewer");
    await logExecution(buildId, projectId, reviewTaskId, "reviewer", "review_code", "in_progress", {
      message: lang === "ar"
        ? "أراجع الكود المُولَّد... أبحث عن أخطاء، مشاكل أمنية، وأفضل الممارسات"
        : "Reviewing generated code... checking for errors, security issues, and best practices",
    });

    const reviewResult = await reviewerAgent.execute(context);
    totalTokens += reviewResult.tokensUsed;
    const reviewCost = estimateCost(reviewResult.tokensUsed, reviewerAgent.modelConfig.model);
    totalCost += reviewCost;

    await recordTokenUsage(userId, projectId, buildId, "reviewer", reviewerAgent.modelConfig.model, reviewResult.tokensUsed, reviewCost);

    if (reviewResult.success) {
      await completeTask(reviewTaskId, reviewResult.tokensUsed, reviewCost, reviewResult.durationMs);
    } else {
      await failTask(reviewTaskId, reviewResult.error ?? "Unknown error", reviewResult.durationMs);
    }

    await logExecution(
      buildId, projectId, reviewTaskId, "reviewer", "review_code",
      reviewResult.success ? "completed" : "failed",
      reviewResult.data,
      reviewResult.tokensUsed,
      reviewResult.durationMs
    );

    if (!reviewResult.success) {
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    const postReviewLimit = await checkSpendingLimits(userId, projectId);
    if (!postReviewLimit.allowed) {
      await logExecution(buildId, projectId, null, "system", "limit_exceeded_mid_build", "failed", {
        reason: postReviewLimit.reason,
        after_agent: "reviewer",
      });
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return;
    }

    const review = reviewResult.data?.review as
      | { approved: boolean; issues: CodeIssue[] }
      | undefined;

    if (review && !review.approved && review.issues.length > 0) {
      if (build.cancelRequested) {
        await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
        return;
      }

      const errorIssues = review.issues.filter((i) => i.severity === "error");
      if (errorIssues.length > 0) {
        const fixTaskId = await createTask(buildId, projectId, "fixer");
        await logExecution(buildId, projectId, fixTaskId, "fixer", "fix_code", "in_progress", { issueCount: errorIssues.length });

        context.tokensUsedSoFar = totalTokens;
        const fixResult = await fixerAgent.executeWithIssues(context, errorIssues);
        totalTokens += fixResult.tokensUsed;
        const fixCost = estimateCost(fixResult.tokensUsed, fixerAgent.modelConfig.model);
        totalCost += fixCost;

        await recordTokenUsage(userId, projectId, buildId, "fixer", fixerAgent.modelConfig.model, fixResult.tokensUsed, fixCost);

        if (fixResult.success) {
          await completeTask(fixTaskId, fixResult.tokensUsed, fixCost, fixResult.durationMs);
        } else {
          await failTask(fixTaskId, fixResult.error ?? "Unknown error", fixResult.durationMs);
        }

        await logExecution(
          buildId, projectId, fixTaskId, "fixer", "fix_code",
          fixResult.success ? "completed" : "failed",
          { tokensUsed: fixResult.tokensUsed },
          fixResult.tokensUsed,
          fixResult.durationMs
        );

        if (!fixResult.success) {
          await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
          return;
        }

        const postFixerLimit = await checkSpendingLimits(userId, projectId);
        if (!postFixerLimit.allowed) {
          await logExecution(buildId, projectId, null, "system", "limit_exceeded_mid_build", "failed", {
            reason: postFixerLimit.reason,
            after_agent: "fixer",
          });
          await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
          return;
        }

        if (fixResult.data?.files) {
          const fixedFiles = fixResult.data.files as GeneratedFile[];
          const fixedMap = new Map(fixedFiles.map(f => [f.filePath, f]));
          generatedFiles = generatedFiles.map(f => fixedMap.get(f.filePath) || f);
          for (const ff of fixedFiles) {
            if (!generatedFiles.some(g => g.filePath === ff.filePath)) {
              generatedFiles.push(ff);
            }
          }
        }
      }
    }

    if (build.cancelRequested) {
      await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
      return;
    }

    const saveTaskId = await createTask(buildId, projectId, "filemanager");
    await logExecution(buildId, projectId, saveTaskId, "filemanager", "save_files", "in_progress", { fileCount: generatedFiles.length });

    const saveResult = await fileManager.saveFiles(projectId, generatedFiles);

    if (saveResult.success) {
      await completeTask(saveTaskId, 0, 0, saveResult.durationMs);
    } else {
      await failTask(saveTaskId, "Failed to save some files", saveResult.durationMs);
    }

    await logExecution(
      buildId, projectId, saveTaskId, "filemanager", "save_files",
      saveResult.success ? "completed" : "failed",
      saveResult.data,
      0,
      saveResult.durationMs
    );

    if (saveResult.success) {
      if (build.cancelRequested) {
        await finalizeBuild(buildId, projectId, "cancelled", totalTokens, totalCost);
        return;
      }

      const runnerTaskId = await createTask(buildId, projectId, "package_runner");
      await logExecution(buildId, projectId, runnerTaskId, "package_runner", "install_and_run", "in_progress", { fileCount: generatedFiles.length });

      const runnerStartTime = Date.now();
      const packageRunner = new PackageRunnerAgent(constitution);
      setRunner(buildId, packageRunner);

      try {
        const runnerResult = await packageRunner.executeWithFiles(projectId, generatedFiles);
        const runnerDuration = Date.now() - runnerStartTime;

        if (runnerResult.success) {
          await completeTask(runnerTaskId, 0, 0, runnerDuration);
        } else {
          await failTask(runnerTaskId, runnerResult.error ?? "Package runner failed", runnerDuration);
        }

        await logExecution(
          buildId, projectId, runnerTaskId, "package_runner", "install_and_run",
          runnerResult.success ? "completed" : "failed",
          runnerResult.data,
          0,
          runnerDuration
        );
      } catch (runnerError) {
        const runnerDuration = Date.now() - runnerStartTime;
        const errMsg = runnerError instanceof Error ? runnerError.message : String(runnerError);
        await failTask(runnerTaskId, errMsg, runnerDuration);
        await logExecution(buildId, projectId, runnerTaskId, "package_runner", "install_and_run", "failed", { error: errMsg }, 0, runnerDuration);
      }

      try {
        await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "in_progress");
        const qaReportId = await runQaWithRetry(buildId, projectId, userId);
        await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "completed", { qaReportId });
      } catch (qaError) {
        console.error(`Build ${buildId} QA pipeline error:`, qaError);
        await logExecution(buildId, projectId, null, "qa_pipeline", "qa_validation", "failed", {
          error: qaError instanceof Error ? qaError.message : String(qaError),
        });
      }
    }

    const finalStatus = !saveResult.success ? "failed" : "completed";
    await finalizeBuild(buildId, projectId, finalStatus, totalTokens, totalCost);
  } catch (error) {
    console.error(`Build ${buildId} (with plan) error:`, error);
    await logExecution(buildId, projectId, null, "system", "build_error", "failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
  }
}

export async function startSurgicalFix(
  projectId: string,
  userId: string,
  errorMessage: string,
  targetFiles?: { path: string; description: string }[]
): Promise<{ success: boolean; buildId: string; fixedFiles: string[]; error?: string }> {
  const constitution = getConstitution();
  const buildId = uuidv4();
  const fileManager = new FileManagerAgent(constitution);
  const fixerAgent = new FixerAgent(constitution);
  const reviewerAgent = new ReviewerAgent(constitution);

  const fixedFilesList: string[] = [];
  let totalTokens = 0;
  let totalCost = 0;

  try {
    activeBuilds.set(buildId, {
      buildId,
      projectId,
      userId,
      status: "in_progress",
      cancelRequested: false,
    });

    await db.update(projectsTable).set({ status: "building" }).where(eq(projectsTable.id, projectId));

    await db.insert(buildTasksTable).values({
      buildId,
      projectId,
      agentType: "surgical_fix",
      status: "in_progress",
      prompt: `Fix: ${errorMessage}`,
    });

    await logExecution(buildId, projectId, null, "system", "surgical_fix_started", "in_progress", {
      errorMessage,
      targetFiles: targetFiles?.map(f => f.path),
    });

    const existingFiles = await fileManager.getProjectFiles(projectId);
    if (existingFiles.length === 0) {
      await logExecution(buildId, projectId, null, "system", "surgical_fix_no_files", "failed", {});
      await finalizeBuild(buildId, projectId, "failed", 0, 0);
      return { success: false, buildId, fixedFiles: [], error: "No files to fix" };
    }

    const filesToAnalyze = targetFiles?.length
      ? existingFiles.filter(f => targetFiles.some(t => f.filePath.includes(t.path) || t.path.includes(f.filePath)))
      : existingFiles;

    const analysisFiles = filesToAnalyze.length > 0 ? filesToAnalyze : existingFiles;

    await logExecution(buildId, projectId, null, "analyzer", "analyze_error", "in_progress", {
      errorMessage,
      analyzingFiles: analysisFiles.map(f => f.filePath),
    });

    const issues = [{
      severity: "error" as const,
      file: analysisFiles[0]?.filePath || "unknown",
      message: errorMessage + (targetFiles?.length ? ` | Context: ${targetFiles.map(t => t.description).join('; ')}` : ''),
      suggestion: "Fix the code to resolve this error",
    }];

    const context: BuildContext = {
      buildId,
      projectId,
      userId,
      prompt: `Fix error: ${errorMessage}`,
      existingFiles: analysisFiles,
      tokensUsedSoFar: 0,
    };

    await logExecution(buildId, projectId, null, "fixer", "fix_code", "in_progress", {
      issueCount: issues.length,
      filesBeingFixed: analysisFiles.map(f => f.filePath),
    });

    const fixResult = await fixerAgent.executeWithIssues(context, issues);
    totalTokens += fixResult.tokensUsed;
    const fixCost = estimateCost(fixResult.tokensUsed, fixerAgent.modelConfig.model);
    totalCost += fixCost;

    await recordTokenUsage(userId, projectId, buildId, "fixer", fixerAgent.modelConfig.model, fixResult.tokensUsed, fixCost);

    if (!fixResult.success) {
      await logExecution(buildId, projectId, null, "fixer", "fix_code", "failed", {
        error: fixResult.error,
      });
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return { success: false, buildId, fixedFiles: [], error: fixResult.error };
    }

    const patchedFiles = fixResult.data?.files as GeneratedFile[];
    if (!patchedFiles?.length) {
      await logExecution(buildId, projectId, null, "fixer", "fix_code", "failed", {
        error: "No files returned from fixer",
      });
      await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
      return { success: false, buildId, fixedFiles: [], error: "Fixer returned no files" };
    }

    for (const pf of patchedFiles) fixedFilesList.push(pf.filePath);

    await logExecution(buildId, projectId, null, "fixer", "fix_code", "completed", {
      fixedFiles: fixedFilesList,
      tokensUsed: fixResult.tokensUsed,
    });

    await logExecution(buildId, projectId, null, "reviewer", "review_fix", "in_progress", {
      reviewingFiles: fixedFilesList,
    });

    const reviewContext: BuildContext = {
      ...context,
      existingFiles: patchedFiles.map(f => ({ filePath: f.filePath, content: f.content })),
      tokensUsedSoFar: totalTokens,
    };

    const reviewResult = await reviewerAgent.execute(reviewContext);
    totalTokens += reviewResult.tokensUsed;
    const reviewCost = estimateCost(reviewResult.tokensUsed, reviewerAgent.modelConfig.model);
    totalCost += reviewCost;

    await recordTokenUsage(userId, projectId, buildId, "reviewer", reviewerAgent.modelConfig.model, reviewResult.tokensUsed, reviewCost);

    const reviewIssues = (reviewResult.data?.issues as { severity: string }[]) || [];
    const hasErrors = reviewIssues.some(i => i.severity === "error");

    await logExecution(buildId, projectId, null, "reviewer", "review_fix", "completed", {
      issueCount: reviewIssues.length,
      hasErrors,
    });

    const allFiles = mergeFiles(existingFiles, patchedFiles);

    const saveResult = await fileManager.saveFiles(projectId, allFiles);

    await logExecution(buildId, projectId, null, "filemanager", "save_fixed_files", saveResult.success ? "completed" : "failed", {
      savedCount: allFiles.length,
      fixedCount: patchedFiles.length,
    });

    await finalizeBuild(buildId, projectId, "completed", totalTokens, totalCost);

    return { success: true, buildId, fixedFiles: fixedFilesList };

  } catch (error) {
    console.error(`[SURGICAL FIX] Error:`, error);
    await logExecution(buildId, projectId, null, "system", "surgical_fix_error", "failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    await finalizeBuild(buildId, projectId, "failed", totalTokens, totalCost);
    return { success: false, buildId, fixedFiles: [], error: error instanceof Error ? error.message : String(error) };
  }
}

async function finalizeBuild(
  buildId: string,
  projectId: string,
  status: BuildStatus,
  totalTokens: number,
  totalCost: number
) {
  const build = activeBuilds.get(buildId);
  if (build) {
    build.status = status;
  }

  const projectStatus = status === "completed" ? "ready" : status === "cancelled" ? "draft" : "failed";

  await db
    .update(projectsTable)
    .set({
      status: projectStatus,
      totalTokensUsed: sql`COALESCE(${projectsTable.totalTokensUsed}, 0) + ${totalTokens}`,
      totalCostUsd: sql`COALESCE(${projectsTable.totalCostUsd}::numeric, 0) + ${totalCost}`,
      updatedAt: new Date(),
    })
    .where(eq(projectsTable.id, projectId));

  const hasInProgressTasks = status === "cancelled" || status === "failed";
  if (hasInProgressTasks) {
    await db
      .update(buildTasksTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(
        and(
          eq(buildTasksTable.buildId, buildId),
          eq(buildTasksTable.status, "in_progress")
        )
      );
  }

  await logExecution(buildId, projectId, null, "system", "build_finished", status, {
    totalTokens,
    totalCost,
  });

  if (build?.userId) {
    try {
      const [proj] = await db
        .select({ name: projectsTable.name })
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId))
        .limit(1);
      const projectName = proj?.name || "Untitled Project";

      if (projectStatus === "ready") {
        await emitBuildComplete({ userId: build.userId, projectName, projectId });
      } else if (projectStatus === "failed") {
        await emitBuildError({ userId: build.userId, projectName, projectId });
      }
    } catch (err) {
      console.error(`Failed to emit build notification for ${buildId}:`, err);
    }
  }

  if (totalCost > 0 && build?.userId) {
    try {
      const [user] = await db
        .select({ creditBalanceUsd: usersTable.creditBalanceUsd })
        .from(usersTable)
        .where(eq(usersTable.id, build.userId))
        .limit(1);

      const currentBalance = parseFloat(user?.creditBalanceUsd ?? "0");
      const actualDeducted = Math.min(currentBalance, totalCost);
      const newBalance = currentBalance - actualDeducted;

      if (actualDeducted > 0) {
        await db
          .update(usersTable)
          .set({ creditBalanceUsd: newBalance.toFixed(6) })
          .where(eq(usersTable.id, build.userId));

        await db.insert(creditsLedgerTable).values({
          userId: build.userId,
          type: "deduction",
          amountUsd: (-actualDeducted).toFixed(6),
          balanceAfter: newBalance.toFixed(6),
          description: `Build cost: ${buildId.slice(0, 8)}`,
          referenceId: buildId,
          referenceType: "build",
        });

        if (newBalance <= 0) {
          await db.insert(notificationsTable).values({
            userId: build.userId,
            type: "credits_depleted",
            title: "Credits Depleted",
            titleAr: "نفاد الرصيد",
            message:
              "Your credit balance has reached zero. Top up your credits to continue building projects.",
            messageAr:
              "وصل رصيدك إلى الصفر. أعد تعبئة رصيدك لمتابعة بناء المشاريع.",
            metadata: JSON.stringify({ topupUrl: "/billing" }),
          });
        } else if (newBalance < 1) {
          await db.insert(notificationsTable).values({
            userId: build.userId,
            type: "credits_low",
            title: "Credits Running Low",
            titleAr: "رصيدك منخفض",
            message: `Your credit balance is low ($${newBalance.toFixed(2)} remaining). Top up to avoid interruptions.`,
            messageAr: `رصيدك منخفض ($${newBalance.toFixed(2)} متبقي). أعد التعبئة لتجنب الانقطاع.`,
            metadata: JSON.stringify({ topupUrl: "/billing", balanceUsd: newBalance }),
          });
        }
      }
    } catch (err) {
      console.error(`Failed to deduct credits for build ${buildId}:`, err);
    }
  }

  setTimeout(() => {
    activeBuilds.delete(buildId);
    removeRunner(buildId);
  }, 5 * 60 * 1000);
}
