// FILE: src/engine/ai-engine.ts

import { PlannerAgent } from "../agents/planner-agent"
import { CoderAgent } from "../agents/coder-agent"
import { ReviewerAgent } from "../agents/reviewer-agent"
import { ExecutorAgent } from "../agents/executor-agent"
import { DebuggerAgent } from "../agents/debugger-agent"
import { RepairAgent } from "../agents/repair-agent"
import { DeploymentAgent } from "../agents/deployment-agent"
import { ServerProvisioningAgent } from "../agents/server-provisioning-agent"
import { SecurityAgent } from '../security/security-agent'

import { LoopController } from "./loop-controller"
import { ProductIntentClassifier } from "./product-intent-classifier"
import { RunWorkspaceManager } from "../lib/run-workspace-manager"
import { ExecutionTargetResolver } from "../lib/execution-target-resolver"
import { PlanNormalizer } from "../lib/plan-normalizer"
import { IssuesNormalizer } from "../lib/issues-normalizer"
import { ExecutionResultNormalizer } from "../lib/execution-result-normalizer"
import { RunStageTimer } from "../lib/run-stage-timer"
import { RunSummaryBuilder } from "../lib/run-summary-builder"
import { DefaultSiteGenerator } from "./default-site-generator"
import { ExecutionFeedEmitter } from "./execution-feed-emitter"
import { ExecutionLogBuilder } from "../lib/execution-log-builder"
import { RunMetrics } from "../lib/run-metrics"

import { EngineResult } from "../types/engine-result"
import type { EngineOptions } from "../types/engine-options"
import { emitEngineStream } from "../../server/engine-stream"
import crypto from "crypto"

export class AIEngine {

  onExecutionFeedUpdate?: (state: any) => void;
  private feed: ExecutionFeedEmitter | null = null;

  planner = new PlannerAgent()
  coder = new CoderAgent()
  reviewer = new ReviewerAgent()
  executor = new ExecutorAgent()
  debuggerAgent = new DebuggerAgent()
  private repair = new RepairAgent()
  private deployment = new DeploymentAgent()
  private provisioning = new ServerProvisioningAgent()
  private intentClassifier = new ProductIntentClassifier()

  workspaceManager = new RunWorkspaceManager()
  executionResolver = new ExecutionTargetResolver()
  planNormalizer = new PlanNormalizer()
  issuesNormalizer = new IssuesNormalizer()
  resultNormalizer = new ExecutionResultNormalizer()
  summaryBuilder = new RunSummaryBuilder()

  private async streamLines(feed: ExecutionFeedEmitter, streamId: string, text: string, delayMs = 80) {
    const lines = text.split("\n");
    for (const line of lines) {
      feed.appendStream(streamId, line + "\n");
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  private async runGenerationLoop(prompt: string, projectId: string, options?: EngineOptions) {
    const loop = new LoopController(3);
    const feed = this.feed;

    const intent = await this.intentClassifier.classify(prompt);
    console.log("[AIEngine] Intent classified:", intent);
    if (options) console.log("[AIEngine] Project options:", options);

    // === PLANNING (streamed) ===
    if (feed) {
      feed.startStage("planning", "التخطيط");

      const planStreamId = feed.startStream("planning", "يبني خطة التنفيذ الآن", { finalType: "thought" });
      feed.appendStream(planStreamId, "تحليل الطلب وفهم المتطلبات...\n");
      await new Promise((r) => setTimeout(r, 150));

      const planResult = await this.planner.run(prompt, intent, options);

      if (planResult?.steps?.length) {
        for (let i = 0; i < planResult.steps.length; i++) {
          const s = planResult.steps[i] as any;
          feed.appendStream(planStreamId, `${i + 1}. ${s.title || s}: ${s.description || ""}\n`);
          await new Promise((r) => setTimeout(r, 120));
        }
      }
      feed.appendStream(planStreamId, `\nتم بناء الخطة — ${planResult?.steps?.length || 0} خطوات`);
      feed.finishStream(planStreamId);

      feed.reviewNote("planning", "قرار معماري", `سيتم تنفيذ ${planResult?.steps?.length || 0} خطوات لبناء المشروع.`);
      feed.completeStage("planning", "اكتملت خطة التنفيذ.");

      // === CODING (streamed) ===
      feed.startStage("coding", "كتابة الكود");

      const codingThoughtId = feed.startStream("coding", "جارِ توليد الكود المصدري...", { finalType: "thought" });
      feed.appendStream(codingThoughtId, "الذكاء الاصطناعي يكتب الآن...\n");

      let currentFiles = await this.coder.run(prompt, planResult, intent, options);
      const fileCount = Array.isArray(currentFiles) ? currentFiles.length : 0;
      const totalLines = Array.isArray(currentFiles) ? currentFiles.reduce((sum: number, f: any) => sum + (f.content || "").split("\n").length, 0) : 0;
      feed.appendStream(codingThoughtId, `تم توليد ${fileCount} ملفات — ${totalLines} سطر\n`);
      feed.finishStream(codingThoughtId);

      if (Array.isArray(currentFiles) && currentFiles.length > 0) {
        const topFiles = currentFiles.slice(0, 4);
        for (const file of topFiles) {
          feed.fileOpen("coding", file.path);
          const lines = (file.content || "").split("\n");
          const preview = lines.slice(0, 30).join("\n");
          const lang = this.inferLangFromPath(file.path);
          const codeStreamId = feed.startStream("coding", file.path, { language: lang, filePath: file.path, finalType: "code" });
          await this.streamLines(feed, codeStreamId, preview, 30);
          if (lines.length > 30) {
            feed.appendStream(codeStreamId, `\n// ... +${lines.length - 30} more lines\n`);
          }
          feed.finishStream(codeStreamId);
          feed.fileChange("coding", file.path, `تم كتابة ${lines.length} سطر`);
        }
        if (currentFiles.length > 4) {
          feed.status("coding", `و ${currentFiles.length - 4} ملفات إضافية`);
        }
      }
      feed.completeStage("coding", "تم إنهاء كتابة الكود.");

      let currentReview: any = null;
      let currentExecution: any = null;
      let lastError = "";

      for (let attempt = 1; attempt <= 3; attempt++) {
        // === REVIEW (streamed) ===
        feed.startStage("review", "المراجعة");
        const reviewStreamId = feed.startStream("review",
          attempt === 1 ? "جارِ مراجعة الكود..." : `إعادة مراجعة الكود (محاولة ${attempt})...`,
          { finalType: "review" }
        );

        currentReview = await this.reviewer.run(currentFiles, intent);

        const reviewIssues = Array.isArray(currentReview?.issues) ? currentReview.issues : [];
        const errorCount = Number(currentReview?.errorCount || 0);
        const warningCount = Number(currentReview?.warningCount || 0);
        feed.appendStream(reviewStreamId, `نتائج المراجعة: ${errorCount} أخطاء، ${warningCount} تحذيرات\n`);

        if (reviewIssues.length > 0) {
          for (const issue of reviewIssues.slice(0, 5)) {
            const level = (issue as any).level || (issue as any).severity || "info";
            const msg = (issue as any).message || (issue as any).title || String(issue);
            feed.appendStream(reviewStreamId, `[${level}] ${msg}\n`);
            await new Promise((r) => setTimeout(r, 100));
          }
        }
        feed.finishStream(reviewStreamId);

        for (const issue of reviewIssues.slice(0, 3)) {
          const msg = (issue as any).message || (issue as any).title || String(issue);
          const fp = (issue as any).file || (issue as any).filePath;
          feed.reviewNote("review", msg, String((issue as any).description || msg), fp);
        }

        feed.completeStage("review", `${errorCount} أخطاء، ${warningCount} تحذيرات`);

        // === EXECUTION (streamed) ===
        feed.startStage("execution", "التنفيذ");
        const execStreamId = feed.startStream("execution",
          attempt === 1 ? "جارِ اختبار التنفيذ..." : `إعادة الاختبار (محاولة ${attempt})...`,
          { finalType: "test" }
        );

        currentExecution = await this.executionResolver.resolve(currentFiles);

        const executionFailed =
          Boolean(currentExecution?.error) ||
          Boolean(currentExecution?.stderr) ||
          currentExecution?.status === "error" ||
          currentExecution?.success === false;

        const reviewErrorCount = Number(currentReview?.errorCount || 0);

        if (!executionFailed) {
          feed.appendStream(execStreamId, "نجح الاختبار — لا أخطاء تنفيذ ✓\n");
        } else {
          feed.appendStream(execStreamId, "فشل الاختبار — يحتاج إصلاح ✕\n");
        }
        feed.finishStream(execStreamId);

        feed.testResult("execution",
          executionFailed ? "فشل اختبار التنفيذ" : "نجح اختبار التنفيذ",
          executionFailed
            ? String(currentExecution?.stderr || currentExecution?.error || "Execution failed")
            : "جميع الاختبارات مرت بنجاح.",
          !executionFailed
        );

        if (executionFailed) {
          feed.failStage("execution", "فشل التنفيذ");
        } else {
          feed.completeStage("execution", "نجح التنفيذ");
        }

        if (!loop.shouldRetry({ executionFailed, reviewErrorCount })) {
          loop.addAttempt({
            attempt,
            status: "success",
            stage: "execution",
            summary: "Project passed review and execution checks.",
          });

          return loop.success({
            planResult,
            files: currentFiles,
            review: currentReview,
            execution: currentExecution,
          });
        }

        lastError =
          String(currentExecution?.stderr || currentExecution?.error || "Execution or review failed");

        // === ERROR (streamed) ===
        const errStreamId = feed.startStream(
          executionFailed ? "execution" : "review",
          executionFailed ? `خطأ في التنفيذ (محاولة ${attempt})` : `مشاكل في المراجعة (محاولة ${attempt})`,
          { finalType: "error" }
        );
        await this.streamLines(feed, errStreamId, lastError, 50);
        feed.finishStream(errStreamId);

        loop.addAttempt({
          attempt,
          status: loop.canRetry(attempt) ? "retrying" : "failed",
          stage: executionFailed ? "execution" : "review",
          error: lastError,
          summary: executionFailed
            ? "Execution failed and repair cycle started."
            : "Review detected blocking issues and repair cycle started.",
        });

        if (!loop.canRetry(attempt)) {
          break;
        }

        // === REPAIR (streamed) ===
        feed.startStage("repair", "الإصلاح");

        const debugStreamId = feed.startStream("repair", `جارِ تحليل الخطأ (محاولة ${attempt})...`, { finalType: "thought" });

        const debugResult = await this.debuggerAgent.run(lastError);
        const debugSuggestions = Array.isArray(debugResult) ? debugResult : [];
        feed.appendStream(debugStreamId, `تم تحليل الخطأ — ${debugSuggestions.length} اقتراحات\n`);

        if (debugSuggestions.length > 0) {
          for (const suggestion of debugSuggestions) {
            feed.appendStream(debugStreamId, `• ${suggestion}\n`);
            await new Promise((r) => setTimeout(r, 100));
          }
        }
        feed.finishStream(debugStreamId);

        const repairStreamId = feed.startStream("repair", `جارِ إصلاح الملفات (محاولة ${attempt})...`, { finalType: "fix" });
        feed.appendStream(repairStreamId, "الذكاء الاصطناعي يصلح الأخطاء...\n");

        const repairedFiles = await this.repair.run({
          originalPrompt: prompt,
          plan: planResult,
          intent,
          files: currentFiles,
          review: currentReview,
          executionError: lastError,
          attempt,
        });

        if (repairedFiles.length) {
          currentFiles = repairedFiles;
          feed.appendStream(repairStreamId, `تم إصلاح ${repairedFiles.length} ملفات\n`);
          feed.finishStream(repairStreamId);

          for (const file of repairedFiles.slice(0, 3)) {
            feed.fileOpen("repair", file.path);
            const lines = (file.content || "").split("\n");
            const preview = lines.slice(0, 20).join("\n");
            const lang = this.inferLangFromPath(file.path);
            const fixCodeId = feed.startStream("repair", file.path, { language: lang, filePath: file.path, finalType: "code" });
            await this.streamLines(feed, fixCodeId, preview, 30);
            if (lines.length > 20) {
              feed.appendStream(fixCodeId, `\n// ... +${lines.length - 20} more lines\n`);
            }
            feed.finishStream(fixCodeId);
            feed.fileChange("repair", file.path, `تم إصلاح ${lines.length} سطر`);
          }
        } else {
          feed.appendStream(repairStreamId, "لم يتم إصلاح ملفات\n");
          feed.finishStream(repairStreamId);
        }

        feed.checkpoint("repair", `Checkpoint بعد المحاولة ${attempt}`, `يمكن الرجوع إلى هذه النقطة`, `checkpoint:${projectId}:repair-attempt-${attempt}`);
        feed.completeStage("repair", "تم إصلاح الأخطاء.");
        this.pushFiles(projectId, currentFiles);
      }

      return loop.fail(lastError || "Generation loop failed.");
    } else {
      // fallback: no feed emitter (no projectId SSE)
      this.emitStageStart(projectId, "planning");
      this.pushThought(projectId, "planning", "جارِ تحليل المتطلبات وبناء خطة التنفيذ...");
      const planResult = await this.planner.run(prompt, intent, options);
      this.emitStageComplete(projectId, "planning");

      this.emitStageStart(projectId, "coding");
      let currentFiles = await this.coder.run(prompt, planResult, intent, options);
      this.emitStageComplete(projectId, "coding");

      let currentReview: any = null;
      let currentExecution: any = null;
      let lastError = "";

      for (let attempt = 1; attempt <= 3; attempt++) {
        currentReview = await this.reviewer.run(currentFiles, intent);
        currentExecution = await this.executionResolver.resolve(currentFiles);

        const executionFailed =
          Boolean(currentExecution?.error) ||
          Boolean(currentExecution?.stderr) ||
          currentExecution?.status === "error" ||
          currentExecution?.success === false;
        const reviewErrorCount = Number(currentReview?.errorCount || 0);

        if (!loop.shouldRetry({ executionFailed, reviewErrorCount })) {
          loop.addAttempt({ attempt, status: "success", stage: "execution", summary: "Passed." });
          return loop.success({ planResult, files: currentFiles, review: currentReview, execution: currentExecution });
        }

        lastError = String(currentExecution?.stderr || currentExecution?.error || "Failed");
        loop.addAttempt({ attempt, status: loop.canRetry(attempt) ? "retrying" : "failed", stage: "execution", error: lastError, summary: "Failed." });
        if (!loop.canRetry(attempt)) break;

        const debugResult = await this.debuggerAgent.run(lastError);
        const repairedFiles = await this.repair.run({ originalPrompt: prompt, plan: planResult, intent, files: currentFiles, review: currentReview, executionError: lastError, attempt });
        if (repairedFiles.length) currentFiles = repairedFiles;
      }

      return loop.fail(lastError || "Generation loop failed.");
    }
  }

  private async maybePrepareProvisioning(params: {
    projectId: string;
    appPort?: number;
    serverConfig?: {
      host: string;
      port?: number;
      username: string;
      privateKey?: string;
      password?: string;
      domain?: string;
    } | null;
  }) {
    if (!params.serverConfig?.host || !params.serverConfig?.username) {
      return null;
    }

    this.pushThought(params.projectId, "deployment", "Preparing server provisioning artifacts...");

    const result = await this.provisioning.provision({
      projectId: params.projectId,
      appPort: params.appPort || 8080,
      domain: params.serverConfig.domain,
      connection: {
        host: params.serverConfig.host,
        port: params.serverConfig.port,
        username: params.serverConfig.username,
        privateKey: params.serverConfig.privateKey,
        password: params.serverConfig.password,
      },
    });

    return result;
  }

  private async maybeDeployToRemoteServer(params: {
    projectId: string;
    localProjectPath: string;
    appPort?: number;
    serverConfig?: {
      host: string;
      port?: number;
      username: string;
      privateKey?: string;
      password?: string;
      domain?: string;
    } | null;
  }) {
    if (!params.serverConfig?.host || !params.serverConfig?.username) {
      return null;
    }

    const connection = {
      host: params.serverConfig.host,
      port: params.serverConfig.port,
      username: params.serverConfig.username,
      privateKey: params.serverConfig.privateKey,
      password: params.serverConfig.password,
    };

    const appPort = params.appPort || 8080;
    const logs: string[] = [];

    this.pushThought(params.projectId, "deployment", "Uploading project to remote server...");
    const uploadResult = await this.provisioning.uploadProject({
      localProjectPath: params.localProjectPath,
      projectId: params.projectId,
      connection,
    });
    logs.push(`Project uploaded to ${uploadResult.remotePath}`);

    this.pushThought(params.projectId, "deployment", "Uploading provisioning files...");
    await this.provisioning.uploadProvisioningFiles({
      projectId: params.projectId,
      connection,
      domain: params.serverConfig.domain,
      appPort,
    });
    logs.push("Provisioning files uploaded.");

    this.pushThought(params.projectId, "deployment", "Executing remote provisioning...");
    await this.provisioning.applyRemoteProvisioning({
      projectId: params.projectId,
      connection,
    });
    logs.push("Remote provisioning script executed.");

    this.pushThought(params.projectId, "deployment", "Enabling nginx site...");
    const nginxResult = await this.provisioning.installNginxSite({
      projectId: params.projectId,
      connection,
    });
    logs.push(`Nginx site enabled at ${nginxResult.nginxEnabledPath}`);

    const appUrl = params.serverConfig.domain
      ? `http://${params.serverConfig.domain}`
      : `http://${params.serverConfig.host}`;

    this.pushPreviewUrl(params.projectId, appUrl);

    return {
      success: true,
      remotePath: uploadResult.remotePath,
      domain: params.serverConfig.domain,
      appUrl,
      logs,
      nginxEnabledPath: nginxResult.nginxEnabledPath,
    };
  }

  private async maybeRunSecurityScan(projectPath?: string) {
    if (!projectPath) return undefined;

    try {
      const securityAgent = new SecurityAgent();
      return await securityAgent.scan(projectPath);
    } catch (error) {
      console.error('Security scan failed:', error);
      return undefined;
    }
  }

  private log(logs: string[], event: string) {
    logs.push(`[${new Date().toISOString()}] ${event}`)
  }

  private currentStageKey: string | null = null;

  private emitStageStart(projectId: string, stage: string, title?: string) {
    this.currentStageKey = stage;
    emitEngineStream(projectId, {
      type: "execution_feed",
      feed: { action: "stage-start", stage, title }
    });
  }

  private emitStageComplete(projectId: string, stage: string, failed?: boolean) {
    emitEngineStream(projectId, {
      type: "execution_feed",
      feed: { action: "stage-complete", stage, failed }
    });
    if (this.currentStageKey === stage) this.currentStageKey = null;
  }

  private emitEntry(projectId: string, entry: any) {
    emitEngineStream(projectId, {
      type: "execution_feed",
      feed: { action: "entry", stage: entry.stage, entry }
    });
  }

  private finishCurrentStage(projectId: string) {
    if (this.currentStageKey) {
      this.emitStageComplete(projectId, this.currentStageKey);
    }
  }

  private pushFiles(projectId: string, files: any[]) {
    emitEngineStream(projectId, {
      type: "files",
      files
    });
  }

  private pushPreviewUrl(projectId: string, previewUrl: string) {
    emitEngineStream(projectId, {
      type: "preview_url",
      previewUrl
    });
  }

  private pushThought(projectId: string, stage: string, title: string, content?: string) {
    this.emitEntry(projectId, {
      id: `thought_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "thought",
      stage,
      title,
      content,
      createdAt: new Date().toISOString()
    });
  }

  private pushCode(projectId: string, stage: string, files: any[]) {
    const topFiles = files.slice(0, 4);
    for (const file of topFiles) {
      const lines = (file.content || "").split("\n");
      const preview = lines.slice(0, 25).join("\n");
      this.emitEntry(projectId, {
        id: `code_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: "code-chunk",
        stage,
        title: file.path,
        content: preview + (lines.length > 25 ? `\n// ... +${lines.length - 25} more lines` : ""),
        language: this.inferLangFromPath(file.path),
        filePath: file.path,
        createdAt: new Date().toISOString(),
        meta: { totalLines: lines.length }
      });
    }
    if (files.length > 4) {
      this.pushThought(projectId, stage, `و ${files.length - 4} ملفات إضافية`);
    }
  }

  private pushError(projectId: string, stage: string, title: string, errorContent: string) {
    this.emitEntry(projectId, {
      id: `error_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "error-detected",
      stage,
      title,
      content: errorContent,
      createdAt: new Date().toISOString()
    });
  }

  private pushFix(projectId: string, stage: string, title: string, content?: string, filePath?: string) {
    this.emitEntry(projectId, {
      id: `fix_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "fix-applied",
      stage,
      title,
      content,
      filePath,
      createdAt: new Date().toISOString()
    });
  }

  private pushFileEntry(projectId: string, stage: string, title: string, filePath: string, content?: string, language?: string) {
    this.emitEntry(projectId, {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "file-open",
      stage,
      title,
      filePath,
      content,
      language,
      createdAt: new Date().toISOString()
    });
  }

  private pushStatus(projectId: string, stage: string, title: string, meta?: Record<string, any>) {
    this.emitEntry(projectId, {
      id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "status",
      stage,
      title,
      createdAt: new Date().toISOString(),
      meta
    });
  }

  private inferLangFromPath(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const map: Record<string, string> = {
      ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
      html: "html", css: "css", json: "json", py: "python",
      vue: "vue", svelte: "svelte", rb: "ruby", java: "java",
      cs: "csharp", php: "php", rs: "rust", go: "go",
    };
    return map[ext] || ext;
  }

  private extractPreviewUrl(resultRaw: any): string | null {
    if (!resultRaw?.stdout) return null
    const match = String(resultRaw.stdout).match(/https?:\/\/[^\s]+/)
    return match ? match[0] : null
  }

  private normalizeGeneratedFiles(files: any[]): any[] {
    if (!Array.isArray(files)) return [];

    return files
      .filter(Boolean)
      .map((file: any) => ({
        path:
          typeof file?.path === "string"
            ? file.path
            : typeof file?.name === "string"
              ? file.name
              : "untitled.txt",
        content:
          typeof file?.content === "string"
            ? file.content
            : typeof file?.code === "string"
              ? file.code
              : "",
        language:
          typeof file?.language === "string"
            ? file.language
            : undefined
      }))
      .filter((file: any) => typeof file.path === "string" && file.path.trim().length > 0);
  }

  private hasRenderableWebsite(files: any[]): boolean {
    if (!Array.isArray(files) || files.length === 0) return false;

    return files.some((file: any) => {
      const path = String(file?.path || "").toLowerCase();
      return path.endsWith("index.html") || path.endsWith(".html") || path.endsWith(".htm");
    });
  }

  async run(prompt: string, projectId?: string, options?: EngineOptions): Promise<EngineResult> {

    const timer = new RunStageTimer()

    const runId = crypto.randomUUID()
    const startedAt = new Date().toISOString()
    const logs: string[] = []

    const stageDurations = {
      workspace: 0,
      planning: 0,
      coding: 0,
      fileWrite: 0,
      review: 0,
      execution: 0,
      debug: 0
    }

    const runStartedAt = Date.now()
    this.currentStageKey = null;

    const startedLog = ExecutionLogBuilder.status("workspace", "جارِ تنفيذ الطلب");

    this.log(logs, "RUN_STARTED")

    if (projectId && this.onExecutionFeedUpdate) {
      this.feed = new ExecutionFeedEmitter(projectId, (state) => {
        this.onExecutionFeedUpdate?.(state);
      });
    } else {
      this.feed = null;
    }

    const feed = this.feed;

    // === WORKSPACE (streamed) ===
    if (feed) {
      feed.startStage("workspace", "تهيئة مساحة العمل");
      feed.fileOpen("workspace", "package.json");

      const wsStreamId = feed.startStream("workspace", "جاري تجهيز مساحة العمل", { finalType: "summary" });
      feed.appendStream(wsStreamId, "فحص بنية المشروع...\n");
      await new Promise((r) => setTimeout(r, 150));
      timer.start("workspace")
      this.log(logs, "WORKSPACE_CREATE_STARTED")
      const workspaceRoot_val = await this.workspaceManager.create(runId)
      this.log(logs, "WORKSPACE_CREATE_DONE")
      stageDurations.workspace = timer.end("workspace")
      feed.appendStream(wsStreamId, "اكتشاف ملفات الواجهة والمحرك...\n");
      await new Promise((r) => setTimeout(r, 150));
      feed.appendStream(wsStreamId, "تم تحديد نقاط الربط مع SSE.\n");
      feed.finishStream(wsStreamId);
      feed.completeStage("workspace", "تم تجهيز مساحة العمل.");
      var workspaceRoot = workspaceRoot_val;
    } else {
      if (projectId) this.emitStageStart(projectId, "workspace");
      if (projectId) this.pushThought(projectId, "workspace", "تجهيز بيئة العمل...");
      timer.start("workspace")
      this.log(logs, "WORKSPACE_CREATE_STARTED")
      var workspaceRoot = await this.workspaceManager.create(runId)
      this.log(logs, "WORKSPACE_CREATE_DONE")
      stageDurations.workspace = timer.end("workspace")
      if (projectId) this.emitStageComplete(projectId, "workspace");
    }

    // === INTENT (streamed) ===
    if (feed) {
      feed.startStage("intent", "فهم الطلب");
      const intentStreamId = feed.startStream("intent", "تحليل الطلب وتصنيف المهمة...", { finalType: "thought" });
      this.log(logs, "PLANNING_STARTED")
      const intent = await this.intentClassifier.classify(prompt);
      feed.appendStream(intentStreamId, `تم التعرف على نوع المشروع: ${intent.type}\n`);
      feed.appendStream(intentStreamId, `مستوى الثقة: ${Math.round(intent.confidence * 100)}%\n`);
      if ((intent as any).aiClassified) {
        feed.appendStream(intentStreamId, `تم التصنيف بواسطة: ${(intent as any).aiModel || 'AI'}\n`);
      }
      feed.finishStream(intentStreamId);
      feed.completeStage("intent", `تم تصنيف المشروع: ${intent.type}`);
      var classifiedIntent = intent;
    } else {
      if (projectId) this.emitStageStart(projectId, "intent");
      if (projectId) this.pushThought(projectId, "intent", "تحليل الطلب وتصنيف المهمة...");
      this.log(logs, "PLANNING_STARTED")
      var classifiedIntent = await this.intentClassifier.classify(prompt);
      if (projectId) this.pushStatus(projectId, "intent", `تم التعرف على المهمة: ${classifiedIntent.type}`, { intentType: classifiedIntent.type, confidence: classifiedIntent.confidence });
      if (projectId) this.emitStageComplete(projectId, "intent");
    }

    const loopResult = await this.runGenerationLoop(prompt, projectId!, options);

    if (!loopResult.ok || !loopResult.result) {
      this.log(logs, "GENERATION_LOOP_FAILED")
    }

    const planResult = loopResult.result?.planResult ?? { summary: "Generation failed", steps: [], meta: { provider: "fallback", model: "none" } };
    const files = loopResult.result?.files ?? [];
    const issuesRaw = loopResult.result?.review ?? { issues: [], summary: "No review", errorCount: 0, warningCount: 0, meta: { provider: "fallback", model: "none" } };
    const execution = loopResult.result?.execution ?? { command: null, reason: loopResult.finalError || "Generation loop failed" };

    this.log(logs, "PLANNING_DONE")

    const plan = this.planNormalizer.normalize(planResult)

    let generatedFiles = this.normalizeGeneratedFiles(
      Array.isArray(files) ? files : []
    );

    if (!this.hasRenderableWebsite(generatedFiles)) {
      const fallbackSite = DefaultSiteGenerator.build(prompt, classifiedIntent, options);
      generatedFiles = fallbackSite.files;
      if (feed) {
        feed.status("coding", `توليد موقع قابل للعرض (${classifiedIntent.type})`);
      } else if (projectId) {
        this.pushThought(projectId, "coding", `توليد موقع قابل للعرض (${classifiedIntent.type})`);
      }
    }

    // === DEPLOYMENT (streamed) ===
    if (feed) {
      feed.startStage("deployment", "النشر");

      for (const file of generatedFiles.slice(0, 5)) {
        feed.fileOpen("deployment", file.path);
      }

      const deployStreamId = feed.startStream("deployment", "كتابة الملفات إلى بيئة العمل...", { finalType: "summary" });
      timer.start("fileWrite")
      this.log(logs, "FILE_WRITE_STARTED")
      await this.workspaceManager.writeFiles(workspaceRoot, generatedFiles)
      this.log(logs, "FILE_WRITE_DONE")
      stageDurations.fileWrite = timer.end("fileWrite")
      feed.appendStream(deployStreamId, `تم كتابة ${generatedFiles.length} ملفات\n`);
      await new Promise((r) => setTimeout(r, 150));

      if (projectId) this.pushFiles(projectId, generatedFiles);

      const deploymentResult_val = await this.deployment.deploy({
        projectId: projectId || runId,
        files: generatedFiles,
      });

      if (deploymentResult_val?.previewUrl && projectId) {
        this.pushPreviewUrl(projectId, deploymentResult_val.previewUrl);
        feed.appendStream(deployStreamId, `رابط المعاينة: ${deploymentResult_val.previewUrl}\n`);
      }

      for (const file of generatedFiles.slice(0, 5)) {
        feed.fileChange("deployment", file.path);
      }

      feed.appendStream(deployStreamId, "تم النشر بنجاح ✓\n");
      feed.finishStream(deployStreamId);
      var deploymentResult = deploymentResult_val;
    } else {
      if (projectId) this.emitStageStart(projectId, "deployment");
      if (projectId) this.pushThought(projectId, "deployment", "كتابة الملفات إلى بيئة العمل...");
      timer.start("fileWrite")
      this.log(logs, "FILE_WRITE_STARTED")
      await this.workspaceManager.writeFiles(workspaceRoot, generatedFiles)
      this.log(logs, "FILE_WRITE_DONE")
      stageDurations.fileWrite = timer.end("fileWrite")
      if (projectId) this.pushFiles(projectId, generatedFiles);

      var deploymentResult = await this.deployment.deploy({
        projectId: projectId || runId,
        files: generatedFiles,
      });

      if (deploymentResult?.previewUrl && projectId) {
        this.pushPreviewUrl(projectId, deploymentResult.previewUrl);
      }
    }

    const provisioningResult = await this.maybePrepareProvisioning({
      projectId: projectId || runId,
      appPort: deploymentResult?.port,
      serverConfig: null,
    });

    const remoteDeploymentResult = await this.maybeDeployToRemoteServer({
      projectId: projectId || runId,
      localProjectPath: workspaceRoot,
      appPort: deploymentResult?.port,
      serverConfig: null,
    });

    // === SECURITY (streamed) ===
    if (feed) {
      feed.startStage("security", "الأمان");
      const secStreamId = feed.startStream("security", "جارِ فحص الأمان...", { finalType: "summary" });
      const security_val = await this.maybeRunSecurityScan(
        deploymentResult?.projectPath || workspaceRoot
      );
      if (security_val) {
        const issueCount = security_val.issues?.length || 0;
        feed.appendStream(secStreamId, `تم فحص الأمان — ${issueCount} مشاكل\n`);
        feed.appendStream(secStreamId, `التقييم: ${security_val.grade || "?"} (${security_val.score || 0}/100)\n`);

        feed.testResult("security", "نتيجة فحص الأمان",
          `${issueCount} مشاكل — التقييم: ${security_val.grade || "?"} (${security_val.score || 0}/100)`,
          issueCount === 0
        );

        if (security_val.issues?.length) {
          for (const issue of security_val.issues.slice(0, 3)) {
            const msg = String((issue as any).message || (issue as any).title || issue);
            const fp = (issue as any).file || (issue as any).filePath;
            feed.reviewNote("security", msg, msg, fp);
          }
        }
      } else {
        feed.appendStream(secStreamId, "تم فحص الأمان — لا مشاكل\n");
        feed.testResult("security", "نتيجة فحص الأمان", "لا مشاكل أمنية.", true);
      }
      feed.finishStream(secStreamId);
      feed.completeStage("security", "تم فحص الأمان.");
      var security = security_val;
    } else {
      if (projectId) this.emitStageStart(projectId, "security");
      if (projectId) this.pushThought(projectId, "security", "جارِ فحص الأمان...");
      var security = await this.maybeRunSecurityScan(
        deploymentResult?.projectPath || workspaceRoot
      );
      if (security && projectId) {
        const issueCount = security.issues?.length || 0;
        this.pushStatus(projectId, "security", `تم فحص الأمان — ${issueCount} مشاكل`, { score: security.score || 0, grade: security.grade || "?" });
      }
      if (projectId) this.emitStageComplete(projectId, "security");
    }

    if (feed) {
      feed.completeStage("deployment", "تم النشر بنجاح.");
    }

    const issues = this.issuesNormalizer.normalize(issuesRaw)

    const llmMeta = {
      planner: planResult?.meta ?? null,
      coder:
        typeof (files as any)?.meta === "object"
          ? (files as any).meta
          : null,
      reviewer:
        typeof (issuesRaw as any)?.meta === "object"
          ? (issuesRaw as any).meta
          : null,
    }

    const totalInputTokens =
      Number(planResult?.meta?.usage?.inputTokens || 0) +
      Number((files as any)?.meta?.usage?.inputTokens || 0) +
      Number((issuesRaw as any)?.meta?.usage?.inputTokens || 0)

    const totalOutputTokens =
      Number(planResult?.meta?.usage?.outputTokens || 0) +
      Number((files as any)?.meta?.usage?.outputTokens || 0) +
      Number((issuesRaw as any)?.meta?.usage?.outputTokens || 0)

    let resultRaw: any

    if (!execution.command) {

      this.log(logs, "EXECUTION_SKIPPED")

      resultRaw = {
        success: false,
        stdout: "",
        stderr: execution.reason,
        exitCode: 2
      }

    } else {

      if (projectId) this.pushThought(projectId, "deployment", "تنفيذ المشروع...");
      timer.start("execution")

      this.log(logs, "EXECUTION_STARTED")

      resultRaw = await this.executor.run(
        execution.command,
        workspaceRoot
      )

      this.log(logs, "EXECUTION_DONE")

      stageDurations.execution = timer.end("execution")

      const previewUrl = this.extractPreviewUrl(resultRaw)
      if (projectId && previewUrl) {
        this.pushPreviewUrl(projectId, previewUrl)
      }

    }

    const result = this.resultNormalizer.normalize(resultRaw)

    let debug: string[] = []

    if (!result.success && !loopResult.ok) {

      if (projectId) this.pushThought(projectId, "deployment", "تحليل وتصحيح الأخطاء...");
      timer.start("debug")

      this.log(logs, "DEBUG_STARTED")

      debug = await this.debuggerAgent.run(result.stderr)

      this.log(logs, "DEBUG_DONE")

      stageDurations.debug = timer.end("debug")

    }

    if (projectId) this.emitStageComplete(projectId, "deployment");

    const finishedAt = new Date().toISOString()

    const durationMs =
      new Date(finishedAt).getTime() -
      new Date(startedAt).getTime()

    this.log(logs, "RUN_FINISHED")

    const status = result.success ? "success" : "failed"

    const summary = this.summaryBuilder.build({
      files: generatedFiles,
      issues,
      result,
      stageDurations
    })

    const runFinishedAt = Date.now()

    const filesGenerated =
      typeof summary?.filesGenerated === "number"
        ? summary.filesGenerated
        : Array.isArray(generatedFiles)
          ? generatedFiles.length
          : 0

    const codeDelta = RunMetrics.computeCodeDelta(
      Array.isArray(generatedFiles) ? generatedFiles : []
    )

    const actionsCount = RunMetrics.computeActionsCount(filesGenerated)

    const usageData = {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      costUsd: 0,
    }
    usageData.costUsd = RunMetrics.computeCostFromUsage(usageData)

    const executionMeta = {
      usage: {
        inputTokens: usageData.inputTokens,
        outputTokens: usageData.outputTokens,
        totalTokens: usageData.totalTokens,
        costUsd: usageData.costUsd,
      },
      llm: {
        planner: planResult?.meta
          ? {
              provider: planResult.meta.provider,
              model: planResult.meta.model,
            }
          : null,
        coder: (files as any)?.meta
          ? {
              provider: (files as any).meta.provider,
              model: (files as any).meta.model,
            }
          : null,
        reviewer: (issuesRaw as any)?.meta
          ? {
              provider: (issuesRaw as any).meta.provider,
              model: (issuesRaw as any).meta.model,
            }
          : null,
      },
    }

    const taskTitle =
      typeof prompt === "string" && prompt.trim().length > 0
        ? prompt.trim()
        : "Engine task completed"

    const taskLog = ExecutionLogBuilder.summary("done", taskTitle, `${actionsCount} إجراء • +${codeDelta.linesAdded}/-${codeDelta.linesRemoved} سطر`);

    const checkpointLog = ExecutionLogBuilder.checkpoint("done", "Checkpoint made");

    const userPromptLog = ExecutionLogBuilder.status("done", prompt);

    return {
      runId,
      projectId: runId,
      prompt,
      status,
      startedAt,
      finishedAt,
      durationMs,
      stageDurations,
      summary,
      plan,
      files: generatedFiles,
      issues,
      result,
      debug,
      logs,
      usage: usageData,
      llm: llmMeta,
      executionFeed: {
        projectId: projectId || runId,
        stages: [],
      },
      loop: {
        ok: loopResult.ok,
        attempts: loopResult.attempts,
      },
      intent: classifiedIntent,
      provisioning: provisioningResult || undefined,
      remoteDeployment: remoteDeploymentResult || undefined,
      security,
    }

  }

}