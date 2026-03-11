// FILE: client/src/components/workspace/workspace-layout.tsx

import { useState, useCallback, useEffect, useRef } from "react";
import { Topbar } from "../layout/topbar";
import type { TopbarTab } from "../layout/topbar";
import { LeftPanel } from "../layout/left-panel";
import { RightPanel } from "../layout/right-panel";
import { PreviewPanel } from "../preview/preview-panel";
import SecurityResultsPanel from "../security/security-results-panel";
import SecurityButton from "../topbar/security-button";
import DevopsResultsPanel from "../devops/devops-results-panel";
import DevopsButton from "../topbar/devops-button";
import { PanelRightOpen, PanelRightClose, Globe, Database, ShieldCheck, TerminalSquare, Container } from "lucide-react";
import type { ExecutionFeedState, ExecutionStageState, ExecutionStageKey, ExecutionEvent } from "../../types/execution-log";
import type { SecurityResult, SecurityMonitoringResult, SecurityFeedEvent, DevopsResult, DevopsFixResult, DevopsMonitoringResult, DevopsFeedEvent } from "../../types/engine-result";
import { getSecurityFeed } from "../../api/security-scan";
import { getProject } from "../../lib/api";

type Props = {
  projectId: string;
};

function ResizeHandle({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-[4px] shrink-0 bg-zinc-800 hover:bg-blue-500 transition-colors cursor-col-resize"
    />
  );
}

const STAGE_TITLES: Record<ExecutionStageKey, string> = {
  workspace: "تجهيز بيئة العمل",
  intent: "تحليل المتطلبات",
  planning: "بناء الخطة",
  coding: "توليد الكود",
  review: "مراجعة الكود",
  repair: "إصلاح الأخطاء",
  execution: "تنفيذ المشروع",
  security: "فحص الأمان",
  devops: "فحص DevOps",
  deployment: "النشر والتوزيع",
  monitoring: "المراقبة",
  done: "تم الانتهاء",
};

function createEmptyFeed(projectId: string): ExecutionFeedState {
  const stageKeys: ExecutionStageKey[] = [
    "workspace", "intent", "planning", "coding", "review",
    "repair", "execution", "security", "devops", "deployment",
    "monitoring", "done"
  ];
  return {
    projectId,
    stages: stageKeys.map((key) => ({
      key,
      title: STAGE_TITLES[key],
      status: "idle" as const,
      events: [],
      collapsed: true,
    })),
  };
}

function applyFeedEvent(
  prev: ExecutionFeedState,
  event: any
): ExecutionFeedState {
  const action = event.action as string;
  const stageKey = event.stage as ExecutionStageKey;

  const stages = prev.stages.map((s) => ({ ...s, events: [...s.events] }));
  let activeStage = prev.activeStage;

  if (action === "stage-start") {
    const idx = stages.findIndex((s) => s.key === stageKey);
    if (idx !== -1) {
      stages[idx].status = "running";
      stages[idx].startedAt = event.startedAt || new Date().toISOString();
      stages[idx].collapsed = false;
    }
    activeStage = stageKey;
  } else if (action === "stage-complete") {
    const idx = stages.findIndex((s) => s.key === stageKey);
    if (idx !== -1) {
      stages[idx].status = event.failed ? "failed" : "completed";
      stages[idx].completedAt = new Date().toISOString();
      stages[idx].collapsed = true;
    }
  } else if (action === "entry" && event.entry) {
    const entry: ExecutionEvent = event.entry;
    const targetStage = entry.stage || stageKey || activeStage || "workspace";
    const idx = stages.findIndex((s) => s.key === targetStage);
    if (idx !== -1) {
      const existingIdx = stages[idx].events.findIndex((e) => e.id === entry.id);
      if (existingIdx !== -1) {
        stages[idx].events[existingIdx] = entry;
      } else {
        stages[idx].events.push(entry);
      }
      if (stages[idx].status === "idle") {
        stages[idx].status = "running";
        stages[idx].collapsed = false;
      }
    }
  }

  return { ...prev, stages, activeStage };
}

export default function WorkspaceLayout({ projectId }: Props) {
  const [leftWidth, setLeftWidth] = useState(340);
  const [rightWidth, setRightWidth] = useState(280);
  const [rightOpen, setRightOpen] = useState(true);
  const [executionFeed, setExecutionFeed] = useState<ExecutionFeedState | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [engineResult, setEngineResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TopbarTab>("preview");
  const [files, setFiles] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [securityResult, setSecurityResult] = useState<SecurityResult | null>(null);
  const [securityMonitoring, setSecurityMonitoring] = useState<SecurityMonitoringResult | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityFeed, setSecurityFeed] = useState<SecurityFeedEvent[]>([]);
  const [securityAiAnalysis, setSecurityAiAnalysis] = useState<any>(null);
  const [devopsResult, setDevopsResult] = useState<DevopsResult | null>(null);
  const [devopsFixResult, setDevopsFixResult] = useState<DevopsFixResult | null>(null);
  const [devopsMonitoring, setDevopsMonitoring] = useState<DevopsMonitoringResult | null>(null);
  const [devopsFeed, setDevopsFeed] = useState<DevopsFeedEvent[]>([]);
  const [devopsLoading, setDevopsLoading] = useState(false);
  const [projectOptions, setProjectOptions] = useState<{ tab?: string; appType?: string; tech?: string; output?: string } | undefined>();
  const sseConnectedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function loadSecurityFeed() {
      try {
        const feed = await getSecurityFeed(".");
        if (mounted) {
          setSecurityFeed(feed);
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadSecurityFeed();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  const [autoRunDone, setAutoRunDone] = useState(false);

  const refetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      await getProject(projectId);
    } catch (_) {}
  }, [projectId]);

  useEffect(() => {
    if (autoRunDone || !projectId) return;

    async function autoRun() {
      try {
        const data = await getProject(projectId);
        const idea = data?.project?.idea;
        const projectOptions = data?.project?.options;
        if (projectOptions) setProjectOptions(projectOptions);
        const shouldAutoRun = data?.project?.autoRun;

        if (!idea || !idea.trim() || !shouldAutoRun) {
          setAutoRunDone(true);
          return;
        }

        setAutoRunDone(true);

        for (let i = 0; i < 20 && !sseConnectedRef.current; i++) {
          await new Promise(r => setTimeout(r, 100));
        }

        setExecutionFeed(createEmptyFeed(projectId));
        setIsRunning(true);

        const { runEngine } = await import("../../lib/api");
        const result = await runEngine({ projectId, prompt: idea, options: projectOptions });
        await handleEngineResult(result);
      } catch (err) {
        console.error("Auto-run failed:", err);
      } finally {
        setIsRunning(false);
      }
    }

    autoRun();
  }, [projectId, autoRunDone]);

  function handleUserPrompt(prompt: string) {
    setExecutionFeed((prev) => {
      const feed = prev || createEmptyFeed(projectId);
      const now = new Date().toISOString();
      const userEvent: import("@/types/execution-log").ExecutionEvent = {
        id: `user-input:${Date.now()}`,
        stage: "workspace",
        type: "user-input",
        title: prompt,
        createdAt: now
      };
      const stages = feed.stages.map((s) => {
        if (s.key === "workspace") {
          return { ...s, events: [...s.events, userEvent] };
        }
        return s;
      });
      return { ...feed, stages };
    });
  }

  async function handleRollbackToCheckpoint(checkpointId: string) {
    await fetch("/api/engine/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, checkpointId })
    });
  }

  async function handleEngineResult(result: any) {
    setEngineResult(result);

    setExecutionFeed((prev) => {
      const feed = prev || createEmptyFeed(projectId);
      const stages = feed.stages.map((s) => {
        if (s.status === "running") {
          return { ...s, status: "completed" as const, collapsed: true, completedAt: new Date().toISOString() };
        }
        return s;
      });
      const doneIdx = stages.findIndex((s) => s.key === "done");
      if (doneIdx !== -1) {
        stages[doneIdx].status = "completed";
        stages[doneIdx].events = [{
          id: `done_${Date.now()}`,
          type: "summary" as const,
          stage: "done" as const,
          title: result?.status === "success" ? "تم التنفيذ بنجاح" : "انتهى التنفيذ مع أخطاء",
          createdAt: new Date().toISOString(),
        }];
      }
      return { ...feed, stages, activeStage: "done" as const };
    });

    if (result?.files && Array.isArray(result.files)) {
      setFiles(result.files);
    }

    if (result?.result?.previewUrl) {
      setPreviewUrl(result.result.previewUrl);
    } else if (result?.previewUrl) {
      setPreviewUrl(result.previewUrl);
    }

    await refetchProject();
  }

  useEffect(() => {
    if (!projectId) return;

    const es = new EventSource(`/api/engine/stream?projectId=${projectId}`);

    es.onopen = () => {
      sseConnectedRef.current = true;
    };

    es.addEventListener("execution-feed", (event) => {
      try {
        const state = JSON.parse((event as MessageEvent).data) as ExecutionFeedState;
        setExecutionFeed(state);
      } catch (err) {
        console.error("SSE execution-feed parse error", err);
      }
    });

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data?.type === "execution_feed" && data?.feed) {
          setExecutionFeed((prev) => {
            const feed = prev || createEmptyFeed(projectId);
            return applyFeedEvent(feed, data.feed);
          });
        }

        if (data?.type === "preview_url" && data?.previewUrl) {
          setPreviewUrl(data.previewUrl);
        }

        if (data?.type === "files" && Array.isArray(data.files)) {
          setFiles(data.files);
        }

        if (data?.type === "engine_result" && data?.result) {
          setEngineResult(data.result);

          setExecutionFeed((prev) => {
            const feed = prev || createEmptyFeed(projectId);
            const stages = feed.stages.map((s) => {
              if (s.status === "running") {
                return { ...s, status: "completed" as const, collapsed: true };
              }
              return s;
            });
            const doneIdx = stages.findIndex((s) => s.key === "done");
            if (doneIdx !== -1) {
              stages[doneIdx].status = "completed";
              stages[doneIdx].events = [{
                id: `done_${Date.now()}`,
                type: "summary" as const,
                stage: "done" as const,
                title: data.result?.status === "success" ? "تم التنفيذ بنجاح" : "انتهى التنفيذ",
                createdAt: new Date().toISOString(),
              }];
            }
            return { ...feed, stages, activeStage: "done" as const };
          });

          if (Array.isArray(data.result?.files)) {
            setFiles(data.result.files);
          }

          if (data.result?.result?.previewUrl) {
            setPreviewUrl(data.result.result.previewUrl);
          } else if (data.result?.previewUrl) {
            setPreviewUrl(data.result.previewUrl);
          }
        }
      } catch (error) {
        console.error("SSE parse error", error);
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [projectId]);

  const handleLeftResize = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX;
    const startW = leftWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setLeftWidth(Math.min(500, Math.max(200, startW + delta)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftWidth]);

  const handleRightResize = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX;
    const startW = rightWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      setRightWidth(Math.min(450, Math.max(180, startW + delta)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [rightWidth]);

  return (
    <div className="h-screen bg-[#0a0f18] text-white flex flex-col">
      <Topbar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-h-0 flex">
        <div style={{ width: leftWidth }} className="shrink-0 h-full">
          <LeftPanel
            projectId={projectId}
            isRunning={isRunning}
            isPaused={isPaused}
            executionFeed={executionFeed}
            options={projectOptions}
            onEngineResult={handleEngineResult}
            onUserPrompt={handleUserPrompt}
          />
        </div>

        <ResizeHandle onMouseDown={handleLeftResize} />

        <main className="flex-1 min-w-0 h-full bg-[#0b111d] relative">
          {activeTab === "preview" && (
            <PreviewPanel previewUrl={previewUrl} files={files} />
          )}

          {activeTab === "publishing" && (
            <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
              <div className="text-center space-y-3">
                <Globe size={40} className="mx-auto text-zinc-600" />
                <p className="text-lg font-medium text-zinc-300">النشر والتوزيع</p>
                <p>قم بنشر مشروعك ليكون متاحاً للجميع</p>
              </div>
            </div>
          )}

          {activeTab === "database" && (
            <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
              <div className="text-center space-y-3">
                <Database size={40} className="mx-auto text-zinc-600" />
                <p className="text-lg font-medium text-zinc-300">قاعدة البيانات</p>
                <p>إدارة بيانات المشروع والجداول</p>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="h-full overflow-y-auto p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-300">
                  <ShieldCheck size={20} />
                  <span className="text-sm font-semibold text-white">فحص الأمان</span>
                </div>
                <SecurityButton
                  projectPath={`.`}
                  onResult={setSecurityResult}
                  onMonitoringResult={setSecurityMonitoring}
                  onFeedResult={setSecurityFeed}
                  onLoadingChange={setSecurityLoading}
                  onAiAnalysis={setSecurityAiAnalysis}
                />
              </div>
              <SecurityResultsPanel result={securityResult} monitoring={securityMonitoring} feed={securityFeed} loading={securityLoading} aiAnalysis={securityAiAnalysis} />
            </div>
          )}

          {activeTab === "devops" && (
            <div className="h-full overflow-y-auto p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Container size={20} />
                  <span className="text-sm font-semibold text-white">فحص DevOps</span>
                </div>
                <DevopsButton
                  projectPath={`.`}
                  onResult={setDevopsResult}
                  onFixResult={setDevopsFixResult}
                  onMonitoringResult={setDevopsMonitoring}
                  onFeedResult={setDevopsFeed}
                  onLoadingChange={setDevopsLoading}
                />
              </div>
              <DevopsResultsPanel result={devopsResult} fixResult={devopsFixResult} monitoring={devopsMonitoring} feed={devopsFeed} loading={devopsLoading} />
            </div>
          )}

          {activeTab === "console" && (
            <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
              <div className="text-center space-y-3">
                <TerminalSquare size={40} className="mx-auto text-zinc-600" />
                <p className="text-lg font-medium text-zinc-300">وحدة التحكم</p>
                <p>عرض سجلات التشغيل والأخطاء</p>
              </div>
            </div>
          )}

          <button
            data-testid="toggle-file-panel"
            onClick={() => setRightOpen((prev) => !prev)}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title={rightOpen ? "طي لوحة الملفات" : "فتح لوحة الملفات"}
          >
            {rightOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </main>

        {rightOpen && (
          <>
            <ResizeHandle onMouseDown={handleRightResize} />
            <div style={{ width: rightWidth }} className="shrink-0 h-full">
              <RightPanel projectId={projectId} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}