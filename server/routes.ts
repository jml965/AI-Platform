// FILE: server/routes.ts
import type { Express } from "express";
import { type Server } from "http";
import { registerHealthRoutes } from "./routes/health";
import { registerProjectRoutes } from "./routes/project-routes";
import { registerProjectStreamRoutes } from "./routes/project-stream";
import { registerProjectControlRoutes } from "./routes/project-control";
import { registerFileContentRoutes } from "./routes/file-content";
import { registerAIEngineRoutes } from "./routes/ai-engine";
import securityScanRouter from "./routes/security-scan";
import securityFeedRouter from "./routes/security-monitor-feed";
import devopsScanRouter from "./routes/devops-scan";
import devopsFixRouter from "./routes/devops-fix";
import devopsFeedRouter from "./routes/devops-feed";
import devopsReadinessRouter from "./routes/devops-readiness";
import deploymentIntelligenceRouter from "./routes/deployment-intelligence";
import engineRollbackRouter from "./routes/engine-rollback";
import { registerExportRoutes } from "./routes/export-routes";
import { registerGithubPushRoutes } from "./routes/github-push";
import { addEngineClient, removeEngineClient, emitEngineStream, emitEngineStreamEvent } from "./engine-stream";
import type { EngineStreamClient } from "./engine-stream";
import { AIEngine } from "../src/engine/ai-engine";
import type { EngineResult } from "../src/types/engine-result";

const engine = new AIEngine();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerHealthRoutes(app);
  registerProjectRoutes(app);
  registerProjectStreamRoutes(app);
  registerProjectControlRoutes(app);
  registerFileContentRoutes(app);
  registerAIEngineRoutes(app);
  app.use("/api", securityScanRouter);
  app.use("/api", securityFeedRouter);
  app.use("/api", devopsScanRouter);
  app.use("/api", devopsFixRouter);
  app.use("/api", devopsFeedRouter);
  app.use("/api", devopsReadinessRouter);
  app.use("/api", deploymentIntelligenceRouter);
  app.use("/api", engineRollbackRouter);
  registerExportRoutes(app);
  registerGithubPushRoutes(app);

  app.get("/api/engine/stream", (req, res) => {
    const projectId = String(req.query.projectId || "");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders?.();

    const client: EngineStreamClient = {
      projectId,
      send(payload) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      },
      sendEvent(event: string, data: any) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    addEngineClient(projectId, client);

    client.send({
      type: "connected",
      projectId
    });

    const interval = setInterval(() => {
      client.send({ type: "ping", ts: Date.now() });
    }, 15000);

    req.on("close", () => {
      clearInterval(interval);
      removeEngineClient(projectId, client);
      res.end();
    });
  });

  app.post("/api/engine/run", async (req, res) => {
    const { prompt, projectId, options } = req.body;

    if (projectId) {
      engine.onExecutionFeedUpdate = (state) => {
        emitEngineStreamEvent(projectId, "execution-feed", state);
      };

      emitEngineStream(projectId, {
        type: "execution_feed",
        feed: {
          action: "entry",
          stage: "workspace",
          entry: {
            id: `start_${Date.now()}`,
            type: "status",
            stage: "workspace",
            title: "جارِ تنفيذ الطلب...",
            createdAt: new Date().toISOString()
          }
        }
      });
    }

    const result: EngineResult = await engine.run(prompt, projectId, options);

    if (projectId) {
      emitEngineStream(projectId, {
        type: "engine_result",
        result
      });

      emitEngineStream(projectId, {
        type: "execution_feed",
        feed: {
          action: "stage-start",
          stage: "done"
        }
      });
      emitEngineStream(projectId, {
        type: "execution_feed",
        feed: {
          action: "entry",
          stage: "done",
          entry: {
            id: `done_${Date.now()}`,
            type: "summary",
            stage: "done",
            title: result.status === "success" ? "تم التنفيذ بنجاح" : "انتهى التنفيذ مع أخطاء",
            content: `${result.summary?.filesGenerated || 0} ملفات • ${result.durationMs ? Math.round(result.durationMs / 1000) : 0} ثانية`,
            createdAt: new Date().toISOString()
          }
        }
      });
      emitEngineStream(projectId, {
        type: "execution_feed",
        feed: {
          action: "stage-complete",
          stage: "done"
        }
      });

      if (result.files?.length) {
        emitEngineStream(projectId, { type: "files", files: result.files });
      }
    }

    res.json(result);
  });

  return httpServer;
}
