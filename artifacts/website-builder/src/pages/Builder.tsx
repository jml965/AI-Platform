import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, Code2, Eye, Check, AlertTriangle, XCircle,
  FileCode2, User, Bot, Search, ChevronRight, ChevronDown,
  FileText, FileJson, FileImage, File, Folder, ArrowLeft, Clock,
  RotateCw, Monitor, Smartphone, Tablet, Laptop, ChevronLeft,
  Rocket, ExternalLink, Square, RefreshCw, Globe, Archive, BarChart3,
  Smartphone as SmartphoneIcon, Users, Lock, Unlock, Paintbrush, Puzzle, Languages,
  Upload, MoreVertical, Pencil, Trash2, FolderPlus, FilePlus, Copy,
  Download, FolderMinus, ChevronsDownUp
} from "lucide-react";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";
import type { ExecutionLog, ProjectFile } from "@workspace/api-client-react";
import {
  useGetProject,
  useGetMe,
  useStartBuild,
  useGetBuildStatus,
  useGetBuildLogs,
  useListProjectFiles,
  useGetTokenSummary,
  useDeployProject,
  useGetDeploymentStatus,
  useUndeployProject,
  useRedeployProject,
} from "@workspace/api-client-react";
import BuildProgress, { inferPhase } from "@/components/builder/BuildProgress";
import CodeEditor from "@/components/builder/CodeEditor";
import ProjectPlan from "@/components/builder/ProjectPlan";
import DomainSettings from "@/components/builder/DomainSettings";
import SeoPanel from "@/components/builder/SeoPanel";
import SnapshotsPanel from "@/components/builder/SnapshotsPanel";
import PwaSettingsPanel from "@/components/builder/PwaSettings";
import CollaborationPanel, { CollaboratorAvatars, FileLockIndicator } from "@/components/builder/CollaborationPanel";
import { useCollaboration } from "@/hooks/useCollaboration";
import PluginStore from "@/components/builder/PluginStore";
import { useUpdateFile } from "@/hooks/useUpdateFile";
import { useCSSEditor } from "@/hooks/useCSSEditor";
import CSSEditorPanel from "@/components/builder/CSSEditorPanel";
import TranslationsPanel from "@/components/builder/TranslationsPanel";
import "@/components/builder/prism-theme.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  buildId?: string;
  timestamp: Date;
  plan?: { title: string; description?: string; status?: "pending" | "done" | "active" }[];
  isLog?: boolean;
  logAgent?: string;
  logStatus?: "running" | "done" | "error";
}

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");
  const autoPromptProcessed = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`chat_${id}`);
    if (saved) {
      try {
        return JSON.parse(saved).map((m: ChatMessage) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch { return []; }
    }
    return [{
      id: "welcome",
      role: "assistant" as const,
      content: lang === "ar"
        ? `مرحباً! أنا مساعدك الذكي 👋\nأخبرني ماذا تريد أن تبني أو اسألني أي سؤال عن مشروعك.`
        : `Hello! I'm your AI assistant 👋\nTell me what you'd like to build, or ask me anything about your project.`,
      timestamp: new Date(),
    }];
  });
  const [activeBuildId, setActiveBuildId] = useState<string | null>(() => {
    return localStorage.getItem(`latestBuild_${id}`);
  });
  const [lastCompletedBuildId, setLastCompletedBuildId] = useState<string | null>(null);
  const [retainedLogs, setRetainedLogs] = useState<ExecutionLog[]>([]);
  const [lastBuildCost, setLastBuildCost] = useState<number | undefined>();
  const [lastBuildTokens, setLastBuildTokens] = useState<number | undefined>();
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState("responsive");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  
  const [planApproved, setPlanApproved] = useState(false);
  const [rightTab, setRightTab] = useState<"code" | "library" | "snapshots" | "plugins" | "collab" | "domains" | "seo" | "build">("code");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [showDeployPanel, setShowDeployPanel] = useState(false);
  const [showPwaPanel, setShowPwaPanel] = useState(false);
  const [showTranslationsPanel, setShowTranslationsPanel] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [strategicMode, setStrategicMode] = useState(false);
  const [strategicMessages, setStrategicMessages] = useState<{ id: string; role: "user" | "assistant"; content: string; thinking?: { model: string; summary: string; durationMs: number }[]; modelsUsed?: string[]; tokensUsed?: number; cost?: number; fixApplied?: boolean; fixedFiles?: string[]; timestamp: Date }[]>([]);
  const [strategicPrompt, setStrategicPrompt] = useState("");
  const [strategicLoading, setStrategicLoading] = useState(false);
  const strategicEndRef = useRef<HTMLDivElement>(null);
  const [cssEditorActive, setCssEditorActive] = useState(false);
  const [cssSaving, setCssSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(340);
  const leftDragRef = useRef<{ startX: number; startW: number } | null>(null);
  const rightDragRef = useRef<{ startX: number; startW: number } | null>(null);

  const MIN_CENTER_WIDTH = 300;

  const handleLeftDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    leftDragRef.current = { startX: e.clientX, startW: leftWidth };
    const onMove = (ev: MouseEvent) => {
      if (!leftDragRef.current) return;
      const isRtl = lang === "ar";
      const delta = isRtl
        ? leftDragRef.current.startX - ev.clientX
        : ev.clientX - leftDragRef.current.startX;
      const newLeft = Math.max(220, Math.min(480, leftDragRef.current.startW + delta));
      const effectiveRight = rightPanelOpen ? rightWidth : 0;
      const centerRemaining = window.innerWidth - newLeft - effectiveRight - 10;
      if (centerRemaining >= MIN_CENTER_WIDTH) {
        setLeftWidth(newLeft);
      }
    };
    const onUp = () => {
      leftDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [leftWidth, rightWidth, rightPanelOpen, lang]);

  const handleRightDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    rightDragRef.current = { startX: e.clientX, startW: rightWidth };
    const onMove = (ev: MouseEvent) => {
      if (!rightDragRef.current) return;
      const isRtl = lang === "ar";
      const delta = isRtl
        ? ev.clientX - rightDragRef.current.startX
        : rightDragRef.current.startX - ev.clientX;
      const newRight = Math.max(260, Math.min(600, rightDragRef.current.startW + delta));
      const effectiveLeft = leftPanelOpen ? leftWidth : 0;
      const centerRemaining = window.innerWidth - effectiveLeft - newRight - 10;
      if (centerRemaining >= MIN_CENTER_WIDTH) {
        setRightWidth(newRight);
      }
    };
    const onUp = () => {
      rightDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [rightWidth, leftWidth, leftPanelOpen, lang]);

  const { data: project } = useGetProject(id || "");
  const { data: me } = useGetMe({ query: { queryKey: ["getMe"], retry: false } });
  const { data: tokenSummary } = useGetTokenSummary();
  const startBuildMut = useStartBuild();
  const updateFileMut = useUpdateFile();

  const handleFileChanged = useCallback((data: { userId: string; displayName: string; filePath: string; content: string }) => {
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: ["listProjectFiles", id] });
  }, [id, queryClient]);

  const {
    collaborators,
    fileLocks,
    notifications,
    connected: wsConnected,
    sendCursorMove,
    sendFileOpen,
    sendFileEdit,
    lockFile,
    unlockFile,
  } = useCollaboration({ projectId: id, onFileChanged: handleFileChanged });
  const deployMut = useDeployProject();
  const undeployMut = useUndeployProject();
  const redeployMut = useRedeployProject();

  const cssEditor = useCSSEditor(iframeRef);

  const handleToggleCSSEditor = useCallback(() => {
    if (cssEditorActive) {
      cssEditor.deactivate();
      setCssEditorActive(false);
    } else {
      cssEditor.activate();
      setCssEditorActive(true);
    }
  }, [cssEditorActive, cssEditor]);

  const { data: deploymentStatus, refetch: refetchDeployment } = useGetDeploymentStatus(id || "", {
    query: {
      queryKey: ["getDeploymentStatus", id || ""],
      enabled: !!id,
      refetchInterval: (query: { state: { data?: { status?: string } } }) => {
        const status = query.state.data?.status;
        return status === "deploying" ? 2000 : false;
      },
      retry: false,
    }
  });

  const { data: buildStatus } = useGetBuildStatus(activeBuildId || "", {
    query: {
      queryKey: ["getBuildStatus", activeBuildId || ""],
      enabled: !!activeBuildId,
      refetchInterval: (query: { state: { data?: { status?: string } } }) => {
        const status = query.state.data?.status;
        const isTerminal = status === "completed" || status === "failed" || status === "cancelled";
        return isTerminal ? false : 3000;
      }
    }
  });

  const logsBuildId = activeBuildId || lastCompletedBuildId;
  const { data: buildLogs } = useGetBuildLogs(logsBuildId || "", {
    query: {
      queryKey: ["getBuildLogs", logsBuildId || ""],
      enabled: !!logsBuildId,
      refetchInterval: () => {
        if (!activeBuildId) return false;
        const isTerminal = buildStatus?.status === "completed" || buildStatus?.status === "failed" || buildStatus?.status === "cancelled";
        return isTerminal ? false : 3000;
      }
    }
  });

  const logs = buildLogs?.data || retainedLogs;

  const { data: projectFiles } = useListProjectFiles(id || "", {
    query: {
      queryKey: ["listProjectFiles", id || ""],
      enabled: !!id,
      refetchInterval: buildStatus?.status === "completed" ? false : 5000
    }
  });

  useEffect(() => {
    if (id && messages.length > 0) {
      localStorage.setItem(`chat_${id}`, JSON.stringify(messages));
    }
  }, [messages, id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const prevLogCountRef = React.useRef(0);

  const agentNames: Record<string, { en: string; ar: string }> = {
    planner: { en: "Planner", ar: "المخطط" },
    codegen: { en: "Code Generator", ar: "مولّد الكود" },
    reviewer: { en: "Code Reviewer", ar: "المراجع" },
    fixer: { en: "Code Fixer", ar: "المصلح" },
    surgical_edit: { en: "Editor", ar: "المحرر" },
    package_runner: { en: "Runner", ar: "المشغّل" },
    qa: { en: "QA", ar: "ضمان الجودة" },
    filemanager: { en: "File Manager", ar: "مدير الملفات" },
  };

  useEffect(() => {
    prevLogCountRef.current = logs.length;
  }, [logs]);

  useEffect(() => {
    if (activeBuildId && buildStatus && (buildStatus.status === "completed" || buildStatus.status === "failed" || buildStatus.status === "cancelled")) {
      if (logs.length > 0) setRetainedLogs([...logs]);
      setLastCompletedBuildId(activeBuildId);
      const finalStatus = buildStatus.status;
      const cost = Number((buildStatus as any)?.totalCostUsd) || 0;
      const tokens = Number((buildStatus as any)?.totalTokensUsed) || 0;
      setLastBuildCost(cost || undefined);
      setLastBuildTokens(tokens || undefined);
      const costStr = cost ? `$${cost.toFixed(4)}` : "";
      const tokensStr = tokens ? tokens.toLocaleString() : "";

      let content: string;
      if (finalStatus === "failed") {
        content = lang === "ar" ? "❌ فشل البناء — راجع سجل التنفيذ لمعرفة التفاصيل" : "❌ Build failed — check the execution log for details";
      } else if (finalStatus === "cancelled") {
        content = lang === "ar" ? "🛑 تم إيقاف البناء" : "🛑 Build cancelled";
      } else {
        const costInfo = costStr
          ? (lang === "ar"
            ? `\n📊 التكلفة: ${costStr} | التوكنز: ${tokensStr}`
            : `\n📊 Cost: ${costStr} | Tokens: ${tokensStr}`)
          : "";
        content = (lang === "ar"
          ? "✅ اكتمل البناء — المشروع جاهز في المعاينة!"
          : "✅ Build complete — project is ready in preview!") + costInfo;
      }

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        timestamp: new Date(),
      }]);
      queryClient.invalidateQueries({ queryKey: ["listProjectFiles", id] });
      queryClient.invalidateQueries({ queryKey: ["getProject", id] });
      prevLogCountRef.current = 0;
      setActiveBuildId(null);
      if (id) localStorage.removeItem(`latestBuild_${id}`);
      setPreviewKey(k => k + 1);
    }
  }, [activeBuildId, buildStatus, id, logs, lang, queryClient]);

  const buildIdSetTime = useRef<number>(0);
  useEffect(() => {
    if (activeBuildId) {
      buildIdSetTime.current = Date.now();
    }
  }, [activeBuildId]);

  useEffect(() => {
    if (!activeBuildId) return;
    const elapsed = Date.now() - buildIdSetTime.current;
    if (elapsed < 10000) {
      if (!buildStatus || buildStatus.status === "in_progress" || buildStatus.status === "pending") {
        const pollTimer = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["getBuildStatus", activeBuildId] });
          queryClient.invalidateQueries({ queryKey: ["getProject", id] });
        }, 3000);
        return () => clearTimeout(pollTimer);
      }
    }
    if (project && project.status !== "building") {
      const isStale = buildStatus && buildStatus.status !== "in_progress" && buildStatus.status !== "pending";
      const noStatusYet = !buildStatus && elapsed > 10000;
      if (isStale || noStatusYet) {
        console.log("[PREVIEW] Clearing stale build ID:", activeBuildId, "project:", project.status, "build:", buildStatus?.status, "elapsed:", elapsed);
        if (logs.length > 0) setRetainedLogs([...logs]);
        if (buildStatus) {
          const c = Number((buildStatus as any)?.totalCostUsd) || 0;
          const tk = Number((buildStatus as any)?.totalTokensUsed) || 0;
          if (c) setLastBuildCost(c);
          if (tk) setLastBuildTokens(tk);
        }
        setLastCompletedBuildId(activeBuildId);
        setActiveBuildId(null);
        if (id) localStorage.removeItem(`latestBuild_${id}`);
        setPreviewKey(k => k + 1);
        return;
      }
    }
    const timeout = setTimeout(() => {
      if (buildStatus?.status === "in_progress" || buildStatus?.status === "pending") {
        queryClient.invalidateQueries({ queryKey: ["getBuildStatus", activeBuildId] });
        queryClient.invalidateQueries({ queryKey: ["getProject", id] });
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [activeBuildId, buildStatus?.status, project?.status, id, queryClient]);



  const sendChatMessage = useCallback(async (text: string, chatHistory: ChatMessage[]) => {
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const history = chatHistory
      .filter(m => (m.role === "user" || m.role === "assistant") && !m.isLog)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    const res = await fetch(`${baseUrl}/api/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ projectId: id, message: text, history }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err?.reply) {
        return err as { reply: string; shouldBuild: boolean; buildId?: string; buildPrompt?: string; tokensUsed: number; costUsd: number };
      }
      throw new Error("عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.");
    }

    return res.json() as Promise<{ reply: string; shouldBuild: boolean; buildId?: string; buildPrompt?: string; tokensUsed: number; costUsd: number }>;
  }, [id]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !id) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    const currentPrompt = prompt;
    setPrompt("");
    setIsChatLoading(true);

    try {
      const chatRes = await sendChatMessage(currentPrompt, [...messages, userMsg]);
      console.log("[CHAT] Response:", JSON.stringify(chatRes));

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: chatRes.reply,
        timestamp: new Date(),
      }]);

      if (chatRes.shouldBuild && chatRes.buildId) {
        const isFix = (chatRes as any).actionType === "fix";
        const fixResult = (chatRes as any).fixResult;

        if (isFix && fixResult) {
          console.log("[FIX] Surgical fix completed:", fixResult);
          queryClient.invalidateQueries({ queryKey: ["listProjectFiles", id] });
          queryClient.invalidateQueries({ queryKey: ["getProject", id] });
          setTimeout(() => {
            setPreviewKey(k => k + 1);
          }, 2000);
          if (fixResult.success && fixResult.fixedFiles?.length > 0) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `✅ ${lang === "ar" ? "تم إصلاح" : "Fixed"}: ${fixResult.fixedFiles.join(", ")}`,
              timestamp: new Date(),
            }]);
          }
        } else {
          console.log("[BUILD] Build started by server:", chatRes.buildId);
          setRetainedLogs([]);
          setLastCompletedBuildId(null);
          setLastBuildCost(undefined);
          setLastBuildTokens(undefined);
          setActiveBuildId(chatRes.buildId);
          localStorage.setItem(`latestBuild_${id}`, chatRes.buildId);
          setPlanApproved(false);
          setRightTab("build");

          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: "assistant",
            content: lang === "ar"
              ? "🚀 بدأ البناء — تابع التقدم في لوحة البناء ←"
              : "🚀 Build started — follow progress in the Build panel →",
            buildId: chatRes.buildId,
            timestamp: new Date(),
          }]);
        }
      }
    } catch (err: any) {
      console.error("[FLOW] Error:", err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ ${err?.message || t.unknown_error}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleStrategicSend = async () => {
    if (!strategicPrompt.trim() || strategicLoading || !id) return;
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: strategicPrompt.trim(), timestamp: new Date() };
    setStrategicMessages(prev => [...prev, userMsg]);
    setStrategicPrompt("");
    setStrategicLoading(true);
    try {
      const res = await fetch("/api/strategic/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId: id, message: userMsg.content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStrategicMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: data.error?.message_ar || data.error?.message || "Error", timestamp: new Date() }]);
        return;
      }
      setStrategicMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        thinking: data.thinking,
        modelsUsed: data.modelsUsed,
        tokensUsed: data.tokensUsed,
        cost: data.cost,
        fixApplied: data.fixApplied,
        fixedFiles: data.fixedFiles,
        timestamp: new Date(),
      }]);
      if (data.fixApplied) {
        queryClient.invalidateQueries({ queryKey: ["listProjectFiles", id] });
        setTimeout(() => setPreviewKey(k => k + 1), 1500);
      }
    } catch (err: any) {
      setStrategicMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: err?.message || "Connection error", timestamp: new Date() }]);
    } finally {
      setStrategicLoading(false);
    }
  };

  useEffect(() => {
    if (strategicEndRef.current) strategicEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [strategicMessages]);

  useEffect(() => {
    if (autoPromptProcessed.current || !id) return;
    const urlParams = new URLSearchParams(window.location.search);
    const initialPrompt = urlParams.get("prompt");
    if (initialPrompt && initialPrompt.trim()) {
      autoPromptProcessed.current = true;
      window.history.replaceState({}, "", window.location.pathname);
      const idea = initialPrompt.trim();
      console.log("[AUTO-PROMPT] Starting build with idea:", idea);
      setTimeout(() => {
        setPrompt(idea);
        setTimeout(() => {
          const btn = document.querySelector("[data-auto-submit]") as HTMLButtonElement;
          if (btn && !btn.disabled) {
            btn.click();
          }
        }, 300);
      }, 1500);
    }
  }, [id]);

  const handleDeploy = async () => {
    if (!id) return;
    try {
      await deployMut.mutateAsync({ data: { projectId: id } });
      refetchDeployment();
    } catch (err) {
      console.error("Deploy failed:", err);
    }
  };

  const handleUndeploy = async () => {
    if (!id || !confirm(t.deploy_confirm_undeploy)) return;
    try {
      await undeployMut.mutateAsync({ projectId: id });
      refetchDeployment();
    } catch (err) {
      console.error("Undeploy failed:", err);
    }
  };

  const handleRedeploy = async () => {
    if (!id) return;
    try {
      await redeployMut.mutateAsync({ projectId: id });
      refetchDeployment();
    } catch (err) {
      console.error("Redeploy failed:", err);
    }
  };

  const isBuilding = buildStatus?.status === "pending" || buildStatus?.status === "in_progress" || startBuildMut.isPending || (!!activeBuildId && !buildStatus);

  const actionCount = logs.length;
  const files = projectFiles?.data || [];
  const isDeploying = deployMut.isPending || redeployMut.isPending || deploymentStatus?.status === "deploying";
  const isDeployed = deploymentStatus?.status === "active";
  const canDeploy = (project?.status === "ready" || files.length > 0) && !isBuilding;

  const handleSaveCSS = useCallback(async () => {
    if (!id || cssEditor.changeCount === 0) return;
    setCssSaving(true);
    try {
      const generatedCSS = cssEditor.generateCSS();
      const cssFile = files.find(f => f.filePath?.endsWith(".css"));
      if (cssFile?.id) {
        const newContent = (cssFile.content || "") + "\n\n/* Visual Editor Changes */\n" + generatedCSS;
        await updateFileMut.mutateAsync({
          projectId: id,
          fileId: cssFile.id,
          content: newContent,
        });
      } else {
        const htmlFileForCSS = files.find(f => f.filePath?.endsWith(".html"));
        if (htmlFileForCSS?.id && htmlFileForCSS.content) {
          const styleTag = `<style>\n/* Visual Editor Changes */\n${generatedCSS}\n</style>`;
          const newContent = htmlFileForCSS.content.replace("</head>", `${styleTag}\n</head>`);
          await updateFileMut.mutateAsync({
            projectId: id,
            fileId: htmlFileForCSS.id,
            content: newContent,
          });
        }
      }
      cssEditor.clearAll();
    } catch (err) {
      console.error("Failed to save CSS:", err);
    } finally {
      setCssSaving(false);
    }
  }, [id, cssEditor, files, updateFileMut]);

  const hasPreview = sandboxRunning || !!sandboxProxyUrl || files.some(f => f.filePath === "package.json");

  const currentPhase = inferPhase(buildStatus?.status, logs);
  const phaseFailed = buildStatus?.status === "failed";

  const [sandboxRunning, setSandboxRunning] = useState(false);

  const recoveryTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (recoveryTriggeredRef.current !== id) {
      recoveryTriggeredRef.current = null;
    }
    const baseUrl = import.meta.env.VITE_API_URL || "";
    let stopped = false;
    let recoveryTriggered = recoveryTriggeredRef.current === id;
    const check = () => {
      if (stopped) return;
      fetch(`${baseUrl}/api/sandbox/project/${id}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (stopped) return;
          if (d && d.status === "running") {
            setSandboxRunning(true);
            recoveryTriggered = false;
            recoveryTriggeredRef.current = null;
          } else {
            setSandboxRunning(false);
            if (!recoveryTriggered && !isBuilding) {
              recoveryTriggered = true;
              recoveryTriggeredRef.current = id || null;
              fetch(`${baseUrl}/api/sandbox/proxy/${id}/`, { method: "HEAD", credentials: "include" })
                .then(() => setTimeout(check, 3000))
                .catch(() => {});
            }
          }
        })
        .catch(() => {
          if (!stopped) setSandboxRunning(false);
        });
    };
    check();
    if (!recoveryTriggered) {
      fetch(`${baseUrl}/api/sandbox/proxy/${id}/`, { method: "HEAD", credentials: "include" })
        .then(() => setTimeout(check, 3000))
        .catch(() => {});
    }
    const pollInterval = isBuilding ? 2000 : 4000;
    const iv = setInterval(check, pollInterval);
    return () => { stopped = true; clearInterval(iv); };
  }, [id, isBuilding]);

  useEffect(() => {
    if (!activeBuildId || !isBuilding) return;
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const es = new EventSource(`${baseUrl}/api/build/${activeBuildId}/runner/stream`, { withCredentials: true });
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "sandbox_started") {
          setSandboxRunning(true);
        } else if (data.type === "info" && typeof data.message === "string" && data.message.includes("Early server running")) {
          setSandboxRunning(true);
        }
      } catch {}
    };
    es.onerror = () => {};
    return () => es.close();
  }, [activeBuildId, isBuilding]);

  const [proxyVerified, setProxyVerified] = useState(false);
  const [proxyFailed, setProxyFailed] = useState(false);

  const sandboxProxyUrl = useMemo(() => {
    if (!id) return null;
    const runnerLog = logs.find(l =>
      l.agentType === "package_runner" &&
      l.status === "completed" &&
      l.details &&
      typeof l.details === "object" &&
      "serverStarted" in l.details &&
      (l.details as Record<string, unknown>).serverStarted === true
    );
    const hasFiles = files.length > 0;
    const hasPackageJson = files.some(f => f.filePath === "package.json");
    if (runnerLog || sandboxRunning || (hasFiles && hasPackageJson)) {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      return `${baseUrl}/api/sandbox/proxy/${id}/`;
    }
    return null;
  }, [id, logs, sandboxRunning, files]);

  useEffect(() => {
    if (!sandboxProxyUrl) {
      setProxyVerified(false);
      setProxyFailed(false);
      return;
    }
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const verify = (attempt: number) => {
      if (cancelled) return;
      fetch(sandboxProxyUrl, { method: "HEAD", credentials: "include" })
        .then(r => {
          if (cancelled) return;
          if (r.status === 202) {
            const delay = Math.min(2000 + attempt * 500, 5000);
            retryTimer = setTimeout(() => verify(attempt + 1), delay);
          } else if (r.status >= 200 && r.status < 300) {
            setProxyVerified(true);
            setProxyFailed(false);
          } else if (attempt < 30) {
            const delay = Math.min(1500 + attempt * 300, 5000);
            retryTimer = setTimeout(() => verify(attempt + 1), delay);
          } else {
            setProxyVerified(false);
            setProxyFailed(true);
          }
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt < 30) {
            const delay = Math.min(2000 + attempt * 500, 5000);
            retryTimer = setTimeout(() => verify(attempt + 1), delay);
          } else {
            setProxyVerified(false);
            setProxyFailed(true);
          }
        });
    };
    verify(0);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [sandboxProxyUrl, previewKey]);

  const previewUrl = (sandboxProxyUrl && proxyVerified && !proxyFailed) ? sandboxProxyUrl : null;



  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match;
    let partKey = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const m = match[0];
      if (m.startsWith('**') && m.endsWith('**')) {
        parts.push(<strong key={partKey++} className="text-[#58a6ff] font-semibold">{m.slice(2, -2)}</strong>);
      } else if (m.startsWith('*') && m.endsWith('*')) {
        parts.push(<em key={partKey++} className="text-[#d2a8ff]">{m.slice(1, -1)}</em>);
      } else if (m.startsWith('`') && m.endsWith('`')) {
        parts.push(<code key={partKey++} className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono">{m.slice(1, -1)}</code>);
      }
      lastIndex = match.index + m.length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  const renderMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const bulletMatch = line.match(/^[-•]\s+(.*)$/);
      if (bulletMatch) {
        const bulletContent = bulletMatch[1];
        return <li key={lineIdx} className="ml-4 list-disc text-[13px]">{parseInlineMarkdown(bulletContent)}</li>;
      }
      return (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {parseInlineMarkdown(line)}
        </React.Fragment>
      );
    });
  };

  const DEVICES = [
    { id: "responsive", label: t.device_responsive, Icon: Monitor, width: null, height: null, group: null },
    { id: "iphone16_pro_max", label: "iPhone 16 Pro Max", Icon: Smartphone, width: 440, height: 956, group: "phone" },
    { id: "iphone16_pro", label: "iPhone 16 Pro", Icon: Smartphone, width: 402, height: 874, group: "phone" },
    { id: "iphone16", label: "iPhone 16", Icon: Smartphone, width: 393, height: 852, group: "phone" },
    { id: "iphone14", label: "iPhone 14", Icon: Smartphone, width: 390, height: 844, group: "phone" },
    { id: "iphonese", label: "iPhone SE", Icon: Smartphone, width: 375, height: 667, group: "phone" },
    { id: "pixel_9_pro", label: "Pixel 9 Pro", Icon: Smartphone, width: 412, height: 915, group: "phone" },
    { id: "pixel_9", label: "Pixel 9", Icon: Smartphone, width: 412, height: 892, group: "phone" },
    { id: "samsung_s25_ultra", label: "Galaxy S25 Ultra", Icon: Smartphone, width: 412, height: 915, group: "phone" },
    { id: "samsung_s25", label: "Galaxy S25", Icon: Smartphone, width: 412, height: 892, group: "phone" },
    { id: "samsung_a15", label: "Galaxy A15", Icon: Smartphone, width: 384, height: 854, group: "phone" },
    { id: "ipad_pro_13", label: "iPad Pro 13\"", Icon: Tablet, width: 1032, height: 1376, group: "tablet" },
    { id: "ipad_pro_11", label: "iPad Pro 11\"", Icon: Tablet, width: 834, height: 1194, group: "tablet" },
    { id: "ipad_air", label: "iPad Air", Icon: Tablet, width: 820, height: 1180, group: "tablet" },
    { id: "ipad_mini", label: "iPad Mini", Icon: Tablet, width: 768, height: 1024, group: "tablet" },
    { id: "samsung_tab_s9", label: "Galaxy Tab S9", Icon: Tablet, width: 800, height: 1280, group: "tablet" },
    { id: "surface_pro", label: "Surface Pro", Icon: Tablet, width: 912, height: 1368, group: "tablet" },
    { id: "macbook_air", label: "MacBook Air 13\"", Icon: Laptop, width: 1280, height: 800, group: "desktop" },
    { id: "macbook_pro_16", label: "MacBook Pro 16\"", Icon: Laptop, width: 1728, height: 1117, group: "desktop" },
    { id: "desktop_hd", label: "Desktop HD", Icon: Monitor, width: 1440, height: 900, group: "desktop" },
    { id: "fullhd", label: "Full HD", Icon: Monitor, width: 1920, height: 1080, group: "desktop" },
    { id: "imac_24", label: "iMac 24\"", Icon: Monitor, width: 2048, height: 1152, group: "desktop" },
    { id: "ultrawide", label: "Ultrawide", Icon: Monitor, width: 2560, height: 1080, group: "desktop" },
  ];

  const currentDevice = DEVICES.find(d => d.id === selectedDevice) ?? DEVICES[0];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPreviewKey(k => k + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleFileUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !id) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        formData.append("files", fileList[i]);
      }
      formData.append("directory", "public/assets");
      const baseUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/projects/${id}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        queryClient.invalidateQueries({ queryKey: ["listProjectFiles", id] });
        setPreviewKey(k => k + 1);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `${t.upload_success}: ${(data.files || []).map((f: any) => f.filePath).join(", ")}`,
          timestamp: new Date(),
        }]);
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || t.upload_error;
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `${t.upload_error}: ${errMsg}`,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: t.upload_error,
        timestamp: new Date(),
      }]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [id, queryClient, t]);

  const [downloading, setDownloading] = useState(false);
  const handleDownloadAll = useCallback(async () => {
    if (!id || !files.length || downloading) return;
    setDownloading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/projects/${id}/download`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : "project.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [id, files, downloading]);

  const handleNavBack = () => {
    try { iframeRef.current?.contentWindow?.history.back(); } catch {}
  };

  const handleNavForward = () => {
    try { iframeRef.current?.contentWindow?.history.forward(); } catch {}
  };

  return (
    <div className="flex h-screen bg-[#0e1525] text-[#e1e4e8] overflow-hidden">

      {leftPanelOpen && <div style={{ width: leftWidth, maxWidth: "50vw" }} className="flex flex-col border-e border-[#1c2333] bg-[#0d1117] flex-shrink-0 relative overflow-hidden">
        <div className="border-b border-[#1c2333]">
          <div className="px-3 py-2 flex items-center gap-2">
            <Link href="/dashboard" className="p-1.5 text-[#8b949e] hover:text-[#e1e4e8] transition-colors rounded hover:bg-[#1c2333]">
              <ArrowLeft className={cn("w-4 h-4", lang === "ar" && "rotate-180")} />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-[#e1e4e8] truncate">{project?.name || t.loading}</h1>
            </div>
            <CollaboratorAvatars collaborators={collaborators} currentUserId={me?.id} />
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1f6feb]/20 text-[#58a6ff] font-medium flex items-center gap-1.5 flex-shrink-0">
              {isBuilding && <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-pulse" />}
              {t.agent_label} • {actionCount}
            </span>
          </div>
          <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStrategicMode(v => !v)}
              className={cn(
                "text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1 flex-shrink-0 transition-all",
                strategicMode
                  ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
                  : "bg-[#1c2333] text-[#8b949e] hover:bg-[#30363d] hover:text-[#e1e4e8]"
              )}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z"/><line x1="9" y1="22" x2="15" y2="22"/><line x1="10" y1="2" x2="10" y2="5"/><line x1="14" y1="2" x2="14" y2="5"/></svg>
              {t.strategic_tab}
            </button>
            <Link
              href={`/project/${id}/analytics`}
              className="text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1 flex-shrink-0 transition-all bg-[#d2a8ff]/10 text-[#d2a8ff] hover:bg-[#d2a8ff]/20"
            >
              <BarChart3 className="w-3 h-3" />
              {t.analytics}
            </Link>
            <button
              onClick={() => { setShowTranslationsPanel(v => !v); setShowDeployPanel(false); setShowPwaPanel(false); }}
              className={cn(
                "text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1 flex-shrink-0 transition-all",
                showTranslationsPanel
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "bg-[#1c2333] text-[#8b949e] hover:bg-[#30363d] hover:text-[#e1e4e8]"
              )}
            >
              <Languages className="w-3 h-3" />
              {t.translations_panel}
            </button>
            <button
              onClick={() => { setShowPwaPanel(v => !v); setShowDeployPanel(false); setShowTranslationsPanel(false); }}
              className={cn(
                "text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1 flex-shrink-0 transition-all",
                showPwaPanel
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-[#1c2333] text-[#8b949e] hover:bg-[#30363d] hover:text-[#e1e4e8]"
              )}
            >
              <SmartphoneIcon className="w-3 h-3" />
              PWA
            </button>
            <button
              onClick={() => { setShowDeployPanel(v => !v); setShowPwaPanel(false); setShowTranslationsPanel(false); }}
              disabled={!canDeploy && !isDeployed && !deploymentStatus}
              className={cn(
                "text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1 flex-shrink-0 transition-all",
                isDeployed
                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  : isDeploying
                    ? "bg-yellow-500/20 text-yellow-400"
                    : deploymentStatus?.status === "stopped"
                      ? "bg-[#484f58]/20 text-[#8b949e] hover:bg-[#484f58]/30"
                      : "bg-[#1f6feb]/20 text-[#58a6ff] hover:bg-[#1f6feb]/30 disabled:opacity-40"
              )}
            >
              {isDeploying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isDeployed ? (
                <Globe className="w-3 h-3" />
              ) : (
                <Rocket className="w-3 h-3" />
              )}
              {isDeploying ? t.deploying : isDeployed ? t.deploy_status_active : t.deploy}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showDeployPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-[#1c2333]"
            >
              <div className="p-3 bg-[#161b22] space-y-2">
                {!canDeploy && !deploymentStatus && (
                  <p className="text-[11px] text-[#8b949e]">{t.deploy_not_ready}</p>
                )}

                {deploymentStatus && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        deploymentStatus.status === "active" ? "bg-emerald-400" :
                        deploymentStatus.status === "deploying" ? "bg-yellow-400 animate-pulse" :
                        deploymentStatus.status === "stopped" ? "bg-[#484f58]" : "bg-red-400"
                      )} />
                      <span className="text-[11px] font-medium text-[#e1e4e8]">
                        {t[`deploy_status_${deploymentStatus.status}` as keyof typeof t] || deploymentStatus.status}
                      </span>
                      <span className="text-[10px] text-[#484f58]">v{deploymentStatus.version}</span>
                    </div>

                    {deploymentStatus.url && (
                      <a
                        href={deploymentStatus.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-[#58a6ff] hover:underline truncate"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        {deploymentStatus.url}
                      </a>
                    )}

                    {deploymentStatus.lastDeployedAt && (
                      <p className="text-[10px] text-[#484f58]">
                        {t.deploy_last_deployed}: {format(new Date(deploymentStatus.lastDeployedAt), 'yyyy-MM-dd HH:mm')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {(!deploymentStatus || deploymentStatus.status === "stopped" || deploymentStatus.status === "failed") && canDeploy && (
                    <button
                      onClick={handleDeploy}
                      disabled={isDeploying}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f6feb] text-white text-[11px] font-medium rounded-md hover:bg-[#388bfd] disabled:opacity-50 transition-colors"
                    >
                      {isDeploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                      {isDeploying ? t.deploying : t.deploy_btn}
                    </button>
                  )}

                  {deploymentStatus?.status === "active" && (
                    <>
                      <button
                        onClick={handleRedeploy}
                        disabled={isDeploying || !canDeploy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f6feb] text-white text-[11px] font-medium rounded-md hover:bg-[#388bfd] disabled:opacity-50 transition-colors"
                      >
                        {redeployMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {redeployMut.isPending ? t.redeploying : t.redeploy}
                      </button>
                      <button
                        onClick={handleUndeploy}
                        disabled={undeployMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 text-[11px] font-medium rounded-md hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                      >
                        {undeployMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                        {undeployMut.isPending ? t.undeploying : t.undeploy}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPwaPanel && id && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-[#1c2333]"
            >
              <PwaSettingsPanel projectId={id} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTranslationsPanel && id && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-[#1c2333] max-h-[60vh]"
            >
              <TranslationsPanel
                projectId={id}
                onInjectSwitcher={() => {
                  if (!id) return;
                  const htmlFileForSwitcher = files.find(f => f.filePath?.endsWith('.html'));
                  if (htmlFileForSwitcher?.id && htmlFileForSwitcher.content) {
                    const switcherScript = `
<script>
(function() {
  var switcher = document.createElement('div');
  switcher.id = 'lang-switcher';
  switcher.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;background:#1a1a2e;border-radius:12px;padding:8px;display:flex;gap:4px;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:system-ui,sans-serif;';
  var langs = document.querySelectorAll('[data-lang]');
  var allLangs = new Set();
  langs.forEach(function(el) { allLangs.add(el.getAttribute('data-lang')); });
  if (allLangs.size === 0) { allLangs.add(document.documentElement.lang || 'en'); }
  allLangs.forEach(function(code) {
    var btn = document.createElement('button');
    btn.textContent = code.toUpperCase();
    btn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;background:#2a2a4a;color:#e1e4e8;transition:all 0.2s;';
    btn.addEventListener('mouseenter', function() { btn.style.background='#3a3a6a'; });
    btn.addEventListener('mouseleave', function() { btn.style.background='#2a2a4a'; });
    btn.addEventListener('click', function() {
      var rtlLangs = ['ar','he','fa','ur'];
      document.documentElement.dir = rtlLangs.indexOf(code) >= 0 ? 'rtl' : 'ltr';
      document.documentElement.lang = code;
      document.querySelectorAll('[data-lang]').forEach(function(el) {
        el.style.display = el.getAttribute('data-lang') === code ? '' : 'none';
      });
      switcher.querySelectorAll('button').forEach(function(b) { b.style.background='#2a2a4a'; });
      btn.style.background='#1f6feb';
    });
    switcher.appendChild(btn);
  });
  document.body.appendChild(switcher);
})();
<\/script>`;
                    const newContent = htmlFileForSwitcher.content.replace('</body>', switcherScript + '\n</body>');
                    updateFileMut.mutateAsync({
                      projectId: id,
                      fileId: htmlFileForSwitcher.id,
                      content: newContent,
                    }).then(() => {
                      handleRefresh();
                    });
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {strategicMode ? (
          <>
            <div className="px-3 py-2 border-b border-amber-500/20 bg-amber-500/5 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z"/><line x1="9" y1="22" x2="15" y2="22"/></svg>
              <span className="text-xs font-medium text-amber-400 flex-1">{t.strategic_agent}</span>
              <button onClick={() => setStrategicMode(false)} className="text-[#8b949e] hover:text-[#e1e4e8] p-0.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {strategicMessages.length === 0 && (
                <div className="text-center mt-12 text-[#8b949e]">
                  <div className="w-14 h-14 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z"/><line x1="9" y1="22" x2="15" y2="22"/></svg>
                  </div>
                  <p className="text-sm font-medium text-[#e1e4e8] mb-1">{t.strategic_agent}</p>
                  <p className="text-xs text-[#8b949e]">{t.strategic_agent_desc}</p>
                </div>
              )}
              {strategicMessages.map(msg => (
                <div key={msg.id} className={cn("flex gap-2", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", msg.role === "user" ? "bg-[#1f6feb]/20 text-[#58a6ff]" : "bg-amber-500/20 text-amber-400")}>
                    {msg.role === "user" ? <User className="w-3 h-3" /> : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z"/></svg>}
                  </div>
                  <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-[13px]", msg.role === "user" ? "bg-[#1f6feb]/10 text-[#e1e4e8]" : "bg-[#161b22] border border-[#30363d] text-[#c9d1d9]")}>
                    <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">{msg.content}</pre>
                    {msg.thinking && msg.thinking.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#30363d]">
                        <div className="text-[10px] text-[#8b949e] space-y-1">
                          {msg.thinking.map((th, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>{th.model}</span>
                              <span className="text-[#484f58]">•</span>
                              <span>{(th.durationMs / 1000).toFixed(1)}s</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.fixApplied !== undefined && (
                      <div className={cn("mt-2 pt-2 border-t border-[#30363d] text-[10px] flex items-center gap-1.5", msg.fixApplied ? "text-emerald-400" : "text-[#8b949e]")}>
                        {msg.fixApplied ? <Check className="w-3 h-3" /> : null}
                        <span>{msg.fixApplied ? t.strategic_fix_applied : ""}</span>
                        {msg.fixedFiles && msg.fixedFiles.length > 0 && (
                          <span className="text-[#484f58]">{msg.fixedFiles.join(", ")}</span>
                        )}
                      </div>
                    )}
                    {msg.tokensUsed && (
                      <div className="mt-1 text-[10px] text-[#484f58] flex items-center gap-2">
                        <span>{msg.tokensUsed.toLocaleString()} {t.tokens_label}</span>
                        {msg.cost && <span>${msg.cost.toFixed(4)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {strategicLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-500/20 text-amber-400">
                    <svg className="w-3 h-3 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z"/></svg>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span className="text-[12px] text-[#c9d1d9]">{t.strategic_thinking}</span>
                  </div>
                </div>
              )}
              <div ref={strategicEndRef} />
            </div>
            <div className="p-3 border-t border-[#1c2333] bg-[#0d1117]">
              <div className="relative">
                <textarea
                  value={strategicPrompt}
                  onChange={e => setStrategicPrompt(e.target.value)}
                  placeholder={t.strategic_placeholder}
                  disabled={strategicLoading}
                  className={cn("w-full bg-[#161b22] border border-amber-500/20 rounded-lg p-3 pe-10 resize-none h-20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all text-sm text-[#e1e4e8] placeholder-[#484f58]", strategicLoading && "opacity-50")}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleStrategicSend(); } }}
                />
                <button
                  onClick={handleStrategicSend}
                  disabled={!strategicPrompt.trim() || strategicLoading}
                  className="absolute end-2 bottom-2 p-1.5 bg-amber-500 text-black rounded-md hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 transition-colors"
                >
                  {strategicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={cn("w-4 h-4", lang === "ar" && "rotate-180")} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && !startBuildMut.isPending && (
            <div className="text-center mt-16 text-[#8b949e]">
              <div className="w-12 h-12 mx-auto bg-[#1c2333] rounded-full flex items-center justify-center mb-3">
                <Code2 className="w-6 h-6 opacity-50" />
              </div>
              <p className="text-sm">{t.prompt_placeholder}</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const completionMsg = msg.role === "assistant" && msg.buildId
                ? messages.find(m => m.role === "assistant" && m.buildId === msg.buildId && m.id !== msg.id && (m.content === t.preview_ready || m.content === t.status_failed))
                : null;
              const isStartMsg = msg.content === t.agents_working;
              const showCheckpoint = isStartMsg && !!completionMsg;
              const elapsed = showCheckpoint && completionMsg ? Math.round((completionMsg.timestamp.getTime() - msg.timestamp.getTime()) / 1000) : null;

              return (
                <React.Fragment key={msg.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2"
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      msg.role === "user" ? "bg-[#1f6feb]/20 text-[#58a6ff]" : "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-[13px] leading-relaxed",
                        msg.role === "user"
                          ? "text-[#e1e4e8]"
                          : "text-[#c9d1d9]"
                      )}>
                        {msg.role === "assistant" ? (
                          <div className="whitespace-pre-wrap">
                            {renderMarkdown(msg.content)}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {msg.plan && msg.plan.length > 0 && (
                        <div className="mt-2">
                          <ProjectPlan
                            steps={msg.plan}
                            isApproved={planApproved}
                            onApprove={() => setPlanApproved(true)}
                            onModify={() => {
                              setPrompt(t.plan_modify_prompt);
                            }}
                          />
                        </div>
                      )}

                      <span className="text-[10px] text-[#484f58] mt-1 block px-1">
                        {format(msg.timestamp, 'HH:mm')}
                      </span>
                    </div>
                  </motion.div>

                  {showCheckpoint && elapsed !== null && (
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className="flex-1 h-px bg-[#1c2333]" />
                      <span className="text-[10px] text-[#484f58] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t.checkpoint} — {elapsed}{t.seconds_short} {t.time_elapsed}
                      </span>
                      <div className="flex-1 h-px bg-[#1c2333]" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </AnimatePresence>

          {isChatLoading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-500/20 text-emerald-400">
                <Bot className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#58a6ff]" />
                <span className="text-[12px] text-[#c9d1d9]">
                  {lang === "ar" ? "يفكر..." : "Thinking..."}
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="p-3 border-t border-[#1c2333] bg-[#0d1117]">
          <div className="flex items-center justify-between mb-2">
            <LanguageToggle className="!bg-[#161b22] !text-[#8b949e] hover:!bg-[#1c2333] !px-2 !py-1 !text-xs !rounded-md" />
            {isBuilding && activeBuildId && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/build/${activeBuildId}/cancel`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                    });
                    if (res.ok) {
                      setMessages(prev => [...prev, {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: lang === "ar" ? "تم إرسال طلب الإلغاء... سيتوقف البناء قريباً" : "Cancel request sent... build will stop shortly",
                        timestamp: new Date(),
                      }]);
                    }
                  } catch {}
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md hover:bg-red-500/20 transition-colors text-xs font-medium"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
                {lang === "ar" ? "إيقاف البناء" : "Stop Build"}
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={isBuilding
                ? (lang === "ar" ? "اكتب ملاحظة أو تعديل للتطبيق بعد انتهاء البناء..." : "Write a note or change for after the build finishes...")
                : t.prompt_placeholder}
              disabled={isChatLoading}
              className={cn(
                "w-full bg-[#161b22] border rounded-lg p-3 pe-10 resize-none h-20 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]/50 transition-all text-sm text-[#e1e4e8] placeholder-[#484f58]",
                isBuilding ? "border-[#58a6ff]/30" : "border-[#30363d]",
                isChatLoading && "opacity-50"
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isBuilding) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <button
              data-auto-submit
              onClick={handleGenerate}
              disabled={isBuilding || !prompt.trim()}
              className="absolute end-2 bottom-2 p-1.5 bg-[#1f6feb] text-white rounded-md hover:bg-[#388bfd] disabled:opacity-40 disabled:hover:bg-[#1f6feb] transition-colors"
            >
              {isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={cn("w-4 h-4", lang === "ar" && "rotate-180")} />}
            </button>
          </div>
        </div>
          </>
        )}
      </div>}

      {leftPanelOpen && (
        <div
          onMouseDown={handleLeftDragStart}
          onDoubleClick={() => setLeftPanelOpen(false)}
          className="w-[3px] cursor-col-resize flex-shrink-0 relative group hover:bg-[#1f6feb] active:bg-[#1f6feb] transition-colors"
        >
          <div className="absolute inset-y-0 -inset-x-1 z-10" />
        </div>
      )}

      {!leftPanelOpen && (
        <button
          onClick={() => setLeftPanelOpen(true)}
          className="w-[3px] flex-shrink-0 relative hover:bg-[#1f6feb] transition-colors cursor-pointer group"
          title="Expand chat"
        >
          <div className="absolute top-1/2 -translate-y-1/2 end-0 translate-x-1/2 w-4 h-8 bg-[#1c2333] border border-[#30363d] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <ChevronRight className={cn("w-3 h-3 text-[#8b949e]", lang === "ar" && "rotate-180")} />
          </div>
        </button>
      )}

      <div className="flex-1 flex flex-col border-e border-[#1c2333] min-w-0">
        {(hasPreview || previewUrl || isBuilding || sandboxRunning) && (
          <div className="h-8 flex items-center gap-1 px-2 border-b border-[#1c2333] bg-[#161b22] flex-shrink-0">
            <button
              onClick={handleNavBack}
              title={t.nav_back}
              className="p-1 rounded text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNavForward}
              title={t.nav_forward}
              className="p-1 rounded text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRefresh}
              title={t.nav_refresh}
              className="p-1 rounded text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333] transition-colors"
            >
              <RotateCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            </button>
            <div className="flex-1 mx-2 bg-[#0d1117] border border-[#30363d] rounded text-[10px] text-[#484f58] font-mono px-2 py-0.5 overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1">
              {previewUrl ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="truncate">{previewUrl}</span>
                </>
              ) : (
                "preview://website"
              )}
            </div>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333] transition-colors"
                title={t.preview_open_external}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <div className="relative">
              <button
                onClick={() => setShowDeviceMenu(v => !v)}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333] transition-colors text-[11px]"
                title={t.device_selector}
              >
                <currentDevice.Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline max-w-[80px] truncate">{currentDevice.label}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              {showDeviceMenu && (
                <div className="absolute end-0 top-full mt-1 w-56 max-h-[420px] overflow-y-auto bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 py-1">
                  {[
                    { group: null, label: null },
                    { group: "phone", label: "📱" },
                    { group: "tablet", label: "⬛" },
                    { group: "desktop", label: "💻" },
                  ].map(({ group, label }) => {
                    const groupDevices = DEVICES.filter(d => d.group === group);
                    if (groupDevices.length === 0) return null;
                    return (
                      <React.Fragment key={group ?? "responsive"}>
                        {label && (
                          <div className="px-3 py-1 text-[10px] font-semibold text-[#484f58] uppercase tracking-wider border-t border-[#21262d] mt-1 pt-1">
                            {label} {group === "phone" ? "Phones" : group === "tablet" ? "Tablets" : "Desktop"}
                          </div>
                        )}
                        {groupDevices.map(device => (
                          <button
                            key={device.id}
                            onClick={() => { setSelectedDevice(device.id); setShowDeviceMenu(false); }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] hover:bg-[#1c2333] transition-colors text-start",
                              selectedDevice === device.id ? "text-[#58a6ff]" : "text-[#c9d1d9]"
                            )}
                          >
                            <device.Icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="flex-1 truncate">{device.label}</span>
                            {device.width && (
                              <span className="text-[10px] text-[#484f58] font-mono">{device.width}×{device.height}</span>
                            )}
                          </button>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
            {!isBuilding && (
              <button
                onClick={handleToggleCSSEditor}
                className={cn(
                  "p-1 rounded transition-colors",
                  cssEditorActive
                    ? "text-[#58a6ff] bg-[#1f6feb]/20"
                    : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
                )}
                title={t.css_editor_tab}
              >
                <Paintbrush className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 relative bg-[#0d1117] overflow-hidden flex flex-col" onClick={() => showDeviceMenu && setShowDeviceMenu(false)}>
          <div className="flex-1 overflow-hidden relative">
            {previewUrl ? (
              <DevicePreviewFrame device={currentDevice} previewKey={previewKey}>
                <iframe
                  key={`url-${previewKey}`}
                  ref={iframeRef}
                  src={previewUrl}
                  className="border-0 bg-white"
                  style={{ width: "100%", height: "100%", display: "block" }}
                  title={t.live_preview}
                  onError={() => {
                    setProxyFailed(true);
                    setProxyVerified(false);
                  }}
                  onLoad={(e) => {
                    try {
                      const iframe = e.currentTarget as HTMLIFrameElement;
                      const doc = iframe.contentDocument;
                      if (doc) {
                        const bodyText = doc.body?.innerText || "";
                        const title = doc.title || "";
                        if (
                          title.includes("Dashboard") ||
                          bodyText.includes("UNAUTHORIZED") ||
                          bodyText.includes("Authentication required")
                        ) {
                          setProxyFailed(true);
                          setProxyVerified(false);
                        }
                      }
                    } catch (_) {
                    }
                  }}
                />
              </DevicePreviewFrame>
            ) : hasPreview ? (
              <div className="h-full flex items-center justify-center bg-[#0d1117]">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-[#58a6ff] animate-spin" />
                  <p className="text-sm text-[#c9d1d9]">{t.preview_connecting || "Starting development server..."}</p>
                  <p className="text-xs text-[#484f58] mt-1">{t.preview_sandbox_starting || "Preparing sandbox environment..."}</p>
                  <button
                    onClick={() => {
                      setProxyFailed(false);
                      setProxyVerified(false);
                      setPreviewKey(k => k + 1);
                      const baseUrl = import.meta.env.VITE_API_URL || "";
                      fetch(`${baseUrl}/api/sandbox/proxy/${id}/`, { method: "HEAD", credentials: "include" }).catch(() => {});
                    }}
                    className="mt-3 px-4 py-1.5 text-xs bg-[#1f6feb]/20 text-[#58a6ff] rounded-md hover:bg-[#1f6feb]/30 transition-colors"
                  >
                    {t.preview_retry}
                  </button>
                </div>
              </div>
            ) : isBuilding ? (
              <div className="h-full flex items-center justify-center text-[#8b949e]">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 text-[#58a6ff] animate-spin" />
                  <p className="text-sm font-medium text-[#58a6ff]">{t.preview_building}</p>
                  <p className="text-xs mt-1 text-[#484f58]">{t.agents_working}</p>
                </div>
              </div>
            ) : sandboxRunning && sandboxProxyUrl && !proxyVerified ? (
              <div className="h-full flex items-center justify-center text-[#8b949e]">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 text-[#d2a8ff] animate-spin" />
                  <p className="text-sm font-medium text-[#d2a8ff]">{t.preview_connecting}</p>
                </div>
              </div>
            ) : sandboxProxyUrl && proxyFailed ? (
              <div className="h-full flex items-center justify-center text-[#484f58]">
                <div className="text-center">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-60" />
                  <p className="text-sm text-amber-400">{t.preview_sandbox_failed}</p>
                  <p className="text-xs text-[#484f58] mt-1">The sandbox may need more time to start</p>
                  <button
                    onClick={() => {
                      setProxyFailed(false);
                      setProxyVerified(false);
                      setPreviewKey(k => k + 1);
                      const baseUrl = import.meta.env.VITE_API_URL || "";
                      fetch(`${baseUrl}/api/sandbox/proxy/${id}/`, { method: "HEAD", credentials: "include" }).catch(() => {});
                    }}
                    className="mt-3 px-4 py-1.5 text-xs bg-[#1f6feb]/20 text-[#58a6ff] rounded-md hover:bg-[#1f6feb]/30 transition-colors"
                  >
                    {t.preview_retry}
                  </button>
                </div>
              </div>
            ) : sandboxRunning && !sandboxProxyUrl ? (
              <div className="h-full flex items-center justify-center text-[#8b949e]">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 text-emerald-400 animate-spin" />
                  <p className="text-sm font-medium text-emerald-400">{t.preview_sandbox_starting}</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[#484f58]">
                <div className="text-center">
                  <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{t.preview_unavailable}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {!rightPanelOpen && (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="w-[3px] flex-shrink-0 relative hover:bg-[#1f6feb] transition-colors cursor-pointer group"
          title="Expand panel"
        >
          <div className="absolute top-1/2 -translate-y-1/2 start-0 -translate-x-1/2 w-4 h-8 bg-[#1c2333] border border-[#30363d] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <ChevronLeft className={cn("w-3 h-3 text-[#8b949e]", lang === "ar" && "rotate-180")} />
          </div>
        </button>
      )}

      {rightPanelOpen && (
        <div
          onMouseDown={handleRightDragStart}
          onDoubleClick={() => setRightPanelOpen(false)}
          className="w-[3px] cursor-col-resize flex-shrink-0 relative group hover:bg-[#1f6feb] active:bg-[#1f6feb] transition-colors"
        >
          <div className="absolute inset-y-0 -inset-x-1 z-10" />
        </div>
      )}

      {cssEditorActive ? (
        <CSSEditorPanel
          selectedElement={cssEditor.selectedElement}
          onChangeProperty={cssEditor.changeProperty}
          onUndo={cssEditor.undo}
          onRedo={cssEditor.redo}
          onSave={handleSaveCSS}
          onClose={handleToggleCSSEditor}
          onClear={cssEditor.clearAll}
          canUndo={cssEditor.canUndo}
          canRedo={cssEditor.canRedo}
          changeCount={cssEditor.changeCount}
          generatedCSS={cssEditor.generateCSS()}
          isSaving={cssSaving}
        />
      ) : rightPanelOpen ? (
        <div style={{ width: rightWidth, maxWidth: "50vw" }} className="flex flex-col bg-[#0d1117] flex-shrink-0 border-s border-[#1c2333] overflow-hidden">
          <div className="h-9 flex items-center border-b border-[#1c2333] bg-[#161b22] flex-shrink-0 px-1 overflow-x-auto">
            {(isBuilding || logs.length > 0) && (
              <button
                onClick={() => setRightTab("build")}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1.5",
                  rightTab === "build"
                    ? "bg-[#0d1117] text-[#e1e4e8] shadow-sm"
                    : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
                )}
              >
                <Rocket className="w-3 h-3" />
                {lang === "ar" ? "البناء" : "Build"}
                {isBuilding && <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-pulse" />}
              </button>
            )}
            <button
              onClick={() => setRightTab("code")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
                rightTab === "code"
                  ? "bg-[#0d1117] text-[#e1e4e8] shadow-sm"
                  : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
              )}
            >
              <Code2 className="w-3 h-3" />
              {t.code_tab}
            </button>
            <button
              onClick={() => setRightTab("library")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                rightTab === "library"
                  ? "bg-[#0d1117] text-[#e1e4e8] shadow-sm"
                  : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
              )}
            >
              {t.library}
            </button>
            <button
              onClick={() => setRightTab("plugins")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
                rightTab === "plugins"
                  ? "bg-[#0d1117] text-[#e1e4e8] shadow-sm"
                  : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
              )}
            >
              <Puzzle className="w-3 h-3" />
              {t.plugin_store}
            </button>
            <button
              onClick={() => setRightTab("snapshots")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
                rightTab === "snapshots"
                  ? "bg-[#0d1117] text-[#e1e4e8] shadow-sm"
                  : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
              )}
            >
              <Archive className="w-3 h-3" />
              {t.snapshots}
            </button>
            <button
              onClick={() => setRightTab("collab")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1.5",
                rightTab === "collab"
                  ? "bg-[#0d1117] text-[#e1e4e8] shadow-sm"
                  : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
              )}
            >
              <Users className="w-3 h-3" />
              {t.collab_panel_title}
              {collaborators.length > 1 && (
                <span className="text-[9px] bg-[#1f6feb]/20 text-[#58a6ff] px-1.5 rounded-full">
                  {collaborators.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRightTab("domains")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
                rightTab === "domains"
                  ? "bg-[#0d1117] text-[#e1e4e8] shadow-sm"
                  : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
              )}
            >
              <Globe className="w-3 h-3" />
              {t.domain_settings}
            </button>
            <button
              onClick={() => setRightTab("seo")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1",
                rightTab === "seo"
                  ? "bg-[#0d1117] text-[#e1e4e8] shadow-sm"
                  : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
              )}
            >
              <Search className="w-3 h-3" />
              {t.seo_tab}
            </button>
          </div>

          {rightTab === "build" ? (
            <BuildPanelContent logs={logs} isBuilding={isBuilding} buildStatus={buildStatus?.status} buildCost={isBuilding ? (buildStatus as any)?.totalCostUsd : lastBuildCost} buildTokens={isBuilding ? (buildStatus as any)?.totalTokensUsed : lastBuildTokens} />
          ) : rightTab === "code" ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-8 flex items-center justify-between px-3 border-b border-[#1c2333] bg-[#161b22]">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">{t.explorer}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloading || !files.length}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#1c2333] rounded transition-colors disabled:opacity-50"
                    title={t.download_all_files}
                  >
                    {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.css,.js,.json,.html,.svg,.woff,.woff2,.ttf,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !id}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#1c2333] rounded transition-colors disabled:opacity-50"
                    title={t.upload_files}
                  >
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <div className="max-h-[200px] overflow-y-auto border-b border-[#1c2333]">
                  <InlineFileTree
                    files={files}
                    projectId={id || ""}
                    selectedIndex={selectedFileIndex}
                    onFileSelect={setSelectedFileIndex}
                  />
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  {files.length > 0 ? (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#1c2333] bg-[#161b22] overflow-x-auto flex-shrink-0">
                        {files.map((f, i) => {
                          const fp = f.filePath || "";
                          const lock = fileLocks[fp];
                          const isLockedByOther = lock && lock.userId !== me?.id;
                          return (
                            <button
                              key={f.id || i}
                              onClick={() => { setSelectedFileIndex(i); sendFileOpen(fp); }}
                              className={cn(
                                "px-2.5 py-1 text-[11px] font-mono rounded transition-colors flex items-center gap-1.5 whitespace-nowrap",
                                selectedFileIndex === i
                                  ? "bg-[#0d1117] text-[#e1e4e8] border border-[#30363d]"
                                  : "text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333]",
                                isLockedByOther && "opacity-60"
                              )}
                            >
                              <FileCode2 className="w-3 h-3" />
                              {fp.split('/').pop() || `file-${i}`}
                              <FileLockIndicator filePath={fp} fileLocks={fileLocks} currentUserId={me?.id} />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex-1 overflow-hidden relative">
                        {(() => {
                          const currentFp = files[selectedFileIndex]?.filePath || "";
                          const currentLock = fileLocks[currentFp];
                          const isLockedByOther = currentLock && currentLock.userId !== me?.id;
                          const isLockedByMe = currentLock && currentLock.userId === me?.id;
                          return (
                            <>
                              {currentFp && !isBuilding && (
                                <div className="absolute top-1 end-2 z-10 flex items-center gap-1">
                                  {isLockedByMe ? (
                                    <button
                                      onClick={() => unlockFile(currentFp)}
                                      className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                    >
                                      <Unlock className="w-2.5 h-2.5" />
                                      {t.collab_unlock}
                                    </button>
                                  ) : !currentLock ? (
                                    <button
                                      onClick={() => lockFile(currentFp)}
                                      className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-[#1c2333] text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#30363d] transition-colors"
                                    >
                                      <Lock className="w-2.5 h-2.5" />
                                      {t.collab_lock}
                                    </button>
                                  ) : null}
                                </div>
                              )}
                              <CodeEditor
                                content={files[selectedFileIndex]?.content || ""}
                                filePath={files[selectedFileIndex]?.filePath || "file.txt"}
                                readOnly={isBuilding || !!isLockedByOther}
                                onSave={!isBuilding && !isLockedByOther && id && files[selectedFileIndex]?.id ? (newContent: string) => {
                                  updateFileMut.mutate({
                                    projectId: id!,
                                    fileId: files[selectedFileIndex].id,
                                    content: newContent,
                                  });
                                  sendFileEdit(currentFp, newContent);
                                } : undefined}
                              />
                            </>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[#484f58]">
                      <p className="text-sm">{t.no_files}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : rightTab === "library" ? (
            <FileLibrary files={files} projectId={id || ""} onFileSelect={(idx) => { setSelectedFileIndex(idx); setRightTab("code"); }} />
          ) : rightTab === "plugins" ? (
            id ? <PluginStore projectId={id} /> : null
          ) : rightTab === "snapshots" ? (
            id ? <SnapshotsPanel projectId={id} /> : null
          ) : rightTab === "domains" ? (
            <div className="flex-1 overflow-y-auto">
              <DomainSettings projectId={id || ""} />
            </div>
          ) : rightTab === "seo" ? (
            <div className="flex-1 overflow-y-auto">
              <SeoPanel projectId={id || ""} />
            </div>
          ) : (
            <CollaborationPanel
              collaborators={collaborators}
              fileLocks={fileLocks}
              notifications={notifications}
              connected={wsConnected}
              currentUserId={me?.id}
              onLockFile={lockFile}
              onUnlockFile={unlockFile}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function getFileIcon(filePath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return <FileCode2 className="w-3.5 h-3.5 text-orange-400" />;
    case 'css': return <FileCode2 className="w-3.5 h-3.5 text-blue-400" />;
    case 'js': case 'jsx': case 'ts': case 'tsx': return <FileCode2 className="w-3.5 h-3.5 text-yellow-400" />;
    case 'json': return <FileJson className="w-3.5 h-3.5 text-green-400" />;
    case 'md': case 'txt': return <FileText className="w-3.5 h-3.5 text-[#8b949e]" />;
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return <FileImage className="w-3.5 h-3.5 text-purple-400" />;
    default: return <File className="w-3.5 h-3.5 text-[#8b949e]" />;
  }
}

function getFileDescription(filePath: string, t: { [key: string]: string }): string {
  const fileName = filePath.split('/').pop()?.toLowerCase() || "";
  const ext = fileName.split('.').pop()?.toLowerCase() || "";

  if (fileName === "package.json") return t.file_desc_package_json;
  if (fileName === "package-lock.json" || fileName === "pnpm-lock.yaml" || fileName === "yarn.lock") return t.file_desc_lock;
  if (fileName === "tsconfig.json") return t.file_desc_tsconfig;
  if (fileName === "index.html") return t.file_desc_index_html;
  if (fileName === "readme.md" || fileName === "readme.txt") return t.file_desc_readme;
  if (fileName === ".gitignore") return t.file_desc_gitignore;
  if (fileName === ".env" || fileName.startsWith(".env.")) return t.file_desc_env_file;
  if (fileName === "vite.config.ts" || fileName === "vite.config.js") return t.file_desc_vite_config;
  if (fileName === "requirements.txt") return t.file_desc_requirements;

  const descMap: Record<string, string> = {
    html: t.file_desc_html,
    css: t.file_desc_css,
    js: t.file_desc_js,
    ts: t.file_desc_ts,
    jsx: t.file_desc_jsx,
    tsx: t.file_desc_tsx,
    json: t.file_desc_json,
    md: t.file_desc_md,
    txt: t.file_desc_txt,
    png: t.file_desc_png,
    jpg: t.file_desc_jpg,
    jpeg: t.file_desc_jpg,
    svg: t.file_desc_svg,
    gif: t.file_desc_gif,
    py: t.file_desc_py,
    env: t.file_desc_env,
    yaml: t.file_desc_yaml,
    yml: t.file_desc_yml,
    lock: t.file_desc_lock,
  };

  return descMap[ext] || t.file_desc_unknown;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  fileIndex?: number;
  fileId?: string;
}

function buildFileTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  files.forEach((file, index) => {
    const parts = (file.filePath || `file-${index}`).split('/').filter(Boolean);
    let current = root;

    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const existing = current.find(n => n.name === part);

      if (existing) {
        current = existing.children;
      } else {
        const node: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isFolder: !isLast,
          children: [],
          fileIndex: isLast ? index : undefined,
          fileId: isLast ? file.id : undefined,
        };
        current.push(node);
        current = node.children;
      }
    });
  });

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(root);
  return root;
}

function FileContextMenu({ node, projectId, files, position, onClose, onRefresh, expandedFolders, setExpandedFolders }: {
  node: TreeNode;
  projectId: string;
  files: ProjectFile[];
  position: { x: number; y: number };
  onClose: () => void;
  onRefresh: () => void;
  expandedFolders: Set<string>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [adding, setAdding] = useState<"file" | "folder" | null>(null);
  const [addName, setAddName] = useState("");
  const baseUrl = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      menuRef.current.style.top = `${position.y - rect.height}px`;
    }
    if (rect.right > window.innerWidth) {
      menuRef.current.style.left = `${position.x - rect.width}px`;
    }
  }, [position]);

  const handleRename = async () => {
    if (!newName.trim() || newName === node.name) { setRenaming(false); return; }
    const parentPath = node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/") + 1) : "";
    if (node.isFolder) {
      const oldPrefix = node.path + "/";
      const newPrefix = parentPath + newName.trim() + "/";
      const folderFiles = files.filter(f => f.filePath.startsWith(oldPrefix) || f.filePath === node.path);
      for (const f of folderFiles) {
        const np = f.filePath.replace(oldPrefix, newPrefix);
        await fetch(`${baseUrl}/api/projects/${projectId}/files/${f.id}/rename`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ newPath: np }),
        });
      }
    } else if (node.fileId) {
      const np = parentPath + newName.trim();
      await fetch(`${baseUrl}/api/projects/${projectId}/files/${node.fileId}/rename`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ newPath: np }),
      });
    }
    onRefresh();
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm(t.file_confirm_delete)) return;
    if (node.isFolder) {
      const prefix = node.path + "/";
      const folderFiles = files.filter(f => f.filePath.startsWith(prefix));
      for (const f of folderFiles) {
        await fetch(`${baseUrl}/api/projects/${projectId}/files/${f.id}`, {
          method: "DELETE", credentials: "include",
        });
      }
    } else if (node.fileId) {
      await fetch(`${baseUrl}/api/projects/${projectId}/files/${node.fileId}`, {
        method: "DELETE", credentials: "include",
      });
    }
    onRefresh();
    onClose();
  };

  const handleAddFile = async () => {
    if (!addName.trim()) { setAdding(null); return; }
    const basePath = node.isFolder ? node.path : (node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/")) : "");
    const filePath = basePath ? `${basePath}/${addName.trim()}` : addName.trim();
    await fetch(`${baseUrl}/api/projects/${projectId}/files`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ filePath, content: "" }),
    });
    onRefresh();
    onClose();
  };

  const handleAddFolder = async () => {
    if (!addName.trim()) { setAdding(null); return; }
    const basePath = node.isFolder ? node.path : (node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/")) : "");
    const filePath = basePath ? `${basePath}/${addName.trim()}/.gitkeep` : `${addName.trim()}/.gitkeep`;
    await fetch(`${baseUrl}/api/projects/${projectId}/files`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ filePath, content: "" }),
    });
    onRefresh();
    onClose();
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path);
    onClose();
  };

  const handleDownload = () => {
    if (node.isFolder) {
      const prefix = node.path + "/";
      const folderFiles = files.filter(f => f.filePath.startsWith(prefix));
      folderFiles.forEach(f => {
        const blob = new Blob([f.content || ""], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = f.filePath.split("/").pop() || "file";
        a.click();
        URL.revokeObjectURL(a.href);
      });
    } else {
      const file = node.fileIndex !== undefined ? files[node.fileIndex] : null;
      if (file) {
        const blob = new Blob([file.content || ""], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = node.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    }
    onClose();
  };

  const handleCollapseChildren = () => {
    if (!node.isFolder) return;
    setExpandedFolders(prev => {
      const next = new Set(prev);
      const collapseRecursive = (nodes: TreeNode[]) => {
        nodes.forEach(n => {
          if (n.isFolder && n.path.startsWith(node.path + "/")) {
            next.delete(n.path);
            collapseRecursive(n.children);
          }
        });
      };
      const findNode = (nodes: TreeNode[]): TreeNode | null => {
        for (const n of nodes) {
          if (n.path === node.path) return n;
          const found = findNode(n.children);
          if (found) return found;
        }
        return null;
      };
      const target = findNode(buildFileTree(files));
      if (target) collapseRecursive(target.children);
      return next;
    });
    onClose();
  };

  if (renaming) {
    return (
      <div ref={menuRef} className="fixed z-[9999] bg-[#1c2333] border border-[#30363d] rounded-lg shadow-2xl p-2 min-w-[200px]" style={{ top: position.y, left: position.x }}>
        <input
          autoFocus
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") onClose(); }}
          placeholder={t.file_enter_new_name}
          className="w-full bg-[#0d1117] border border-[#58a6ff] rounded px-2 py-1.5 text-[12px] text-[#e1e4e8] focus:outline-none"
        />
        <div className="flex gap-1 mt-1.5">
          <button onClick={handleRename} className="flex-1 bg-[#238636] text-white text-[11px] rounded px-2 py-1 hover:bg-[#2ea043]">OK</button>
          <button onClick={onClose} className="flex-1 bg-[#30363d] text-[#8b949e] text-[11px] rounded px-2 py-1 hover:bg-[#3d444d]">✕</button>
        </div>
      </div>
    );
  }

  if (adding) {
    return (
      <div ref={menuRef} className="fixed z-[9999] bg-[#1c2333] border border-[#30363d] rounded-lg shadow-2xl p-2 min-w-[200px]" style={{ top: position.y, left: position.x }}>
        <input
          autoFocus
          value={addName}
          onChange={e => setAddName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { adding === "file" ? handleAddFile() : handleAddFolder(); } if (e.key === "Escape") onClose(); }}
          placeholder={adding === "file" ? t.file_enter_name : t.file_enter_folder}
          className="w-full bg-[#0d1117] border border-[#58a6ff] rounded px-2 py-1.5 text-[12px] text-[#e1e4e8] focus:outline-none"
        />
        <div className="flex gap-1 mt-1.5">
          <button onClick={adding === "file" ? handleAddFile : handleAddFolder} className="flex-1 bg-[#238636] text-white text-[11px] rounded px-2 py-1 hover:bg-[#2ea043]">OK</button>
          <button onClick={onClose} className="flex-1 bg-[#30363d] text-[#8b949e] text-[11px] rounded px-2 py-1 hover:bg-[#3d444d]">✕</button>
        </div>
      </div>
    );
  }

  const MenuItem = ({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded transition-colors text-start",
        danger ? "text-[#f85149] hover:bg-[#f8514920]" : "text-[#e1e4e8] hover:bg-[#30363d]"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div ref={menuRef} className="fixed z-[9999] bg-[#1c2333] border border-[#30363d] rounded-lg shadow-2xl py-1.5 min-w-[220px]" style={{ top: position.y, left: position.x }}>
      <MenuItem icon={<Pencil className="w-4 h-4" />} label={t.file_rename} onClick={() => setRenaming(true)} />
      <div className="h-px bg-[#30363d] my-1" />
      <MenuItem icon={<FilePlus className="w-4 h-4" />} label={t.file_add_file} onClick={() => setAdding("file")} />
      <MenuItem icon={<FolderPlus className="w-4 h-4" />} label={t.file_add_folder} onClick={() => setAdding("folder")} />
      {node.isFolder && (
        <MenuItem icon={<ChevronsDownUp className="w-4 h-4" />} label={t.file_collapse_children} onClick={handleCollapseChildren} />
      )}
      <div className="h-px bg-[#30363d] my-1" />
      <MenuItem icon={<Copy className="w-4 h-4" />} label={t.file_copy_path} onClick={handleCopyPath} />
      <MenuItem
        icon={<Download className="w-4 h-4" />}
        label={node.isFolder ? t.file_download_folder : t.file_download}
        onClick={handleDownload}
      />
      <div className="h-px bg-[#30363d] my-1" />
      <MenuItem icon={<Trash2 className="w-4 h-4" />} label={t.file_delete} onClick={handleDelete} danger />
    </div>
  );
}

function FileLibrary({ files, projectId, onFileSelect }: { files: ProjectFile[]; projectId: string; onFileSelect: (idx: number) => void }) {
  const { t } = useI18n();
  const tRecord = t as unknown as Record<string, string>;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ node: TreeNode; x: number; y: number } | null>(null);

  const tree = useMemo(() => buildFileTree(files), [files]);

  useEffect(() => {
    const allFolders = new Set<string>();
    const collectFolders = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        if (n.isFolder) {
          allFolders.add(n.path);
          collectFolders(n.children);
        }
      });
    };
    collectFolders(tree);
    setExpandedFolders(allFolders);
  }, [tree]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const filterTree = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query) return nodes;
    return nodes.reduce<TreeNode[]>((acc, node) => {
      if (node.isFolder) {
        const filtered = filterTree(node.children, query);
        if (filtered.length > 0) {
          acc.push({ ...node, children: filtered });
        }
      } else if (node.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(node);
      }
      return acc;
    }, []);
  };

  const filteredTree = filterTree(tree, searchQuery);

  const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ node, x: e.clientX, y: e.clientY });
  };

  const handleDotsClick = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ node, x: rect.left, y: rect.bottom + 4 });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["listProjectFiles", projectId] });
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const isExpanded = expandedFolders.has(node.path);
      return (
        <div key={node.path}>
          <div
            className="file-row w-full flex items-center gap-1.5 px-2 py-1 text-[12px] text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333] rounded transition-colors cursor-pointer"
            style={{ paddingInlineStart: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
            onContextMenu={e => handleContextMenu(e, node)}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
            <Folder className={cn("w-3.5 h-3.5 flex-shrink-0", isExpanded ? "text-[#58a6ff]" : "text-[#8b949e]")} />
            <span className="truncate flex-1">{node.name}</span>
            <button
              onClick={e => handleDotsClick(e, node)}
              className="file-dots"
              style={{ opacity: 1, flexShrink: 0, padding: '2px', borderRadius: '4px', fontSize: '14px', lineHeight: 1, color: '#8b949e', background: 'transparent', border: 'none', cursor: 'pointer', minWidth: '18px', textAlign: 'center' }}
            >
              ⋮
            </button>
          </div>
          {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        className="file-row w-full flex items-center gap-1.5 px-2 py-1 text-[12px] text-[#c9d1d9] hover:text-[#e1e4e8] hover:bg-[#1c2333] rounded transition-colors cursor-pointer"
        style={{ paddingInlineStart: `${depth * 12 + 20}px` }}
        onClick={() => node.fileIndex !== undefined && onFileSelect(node.fileIndex)}
        onContextMenu={e => handleContextMenu(e, node)}
      >
        {getFileIcon(node.name)}
        <span className="truncate flex-1">{node.name}</span>
        <button
          onClick={e => handleDotsClick(e, node)}
          className="file-dots"
          style={{ opacity: 1, flexShrink: 0, padding: '2px', borderRadius: '4px', fontSize: '14px', lineHeight: 1, color: '#8b949e', background: 'transparent', border: 'none', cursor: 'pointer', minWidth: '18px', textAlign: 'center' }}
        >
          ⋮
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="px-2 py-2 border-b border-[#1c2333]">
        <div className="relative">
          <Search className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.search_files}
            className="w-full bg-[#161b22] border border-[#30363d] rounded-md ps-7 pe-2 py-1.5 text-[12px] text-[#e1e4e8] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {filteredTree.length > 0 ? (
          filteredTree.map(node => renderNode(node))
        ) : (
          <div className="text-center text-[#484f58] text-xs mt-8">
            {t.no_files}
          </div>
        )}
      </div>

      {contextMenu && (
        <FileContextMenu
          node={contextMenu.node}
          projectId={projectId}
          files={files}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onRefresh={handleRefresh}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
        />
      )}
    </>
  );
}

function InlineFileTree({ files, projectId, selectedIndex, onFileSelect }: { files: ProjectFile[]; projectId: string; selectedIndex: number; onFileSelect: (idx: number) => void }) {
  const { t } = useI18n();
  const tRecord = t as unknown as Record<string, string>;
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ node: TreeNode; x: number; y: number } | null>(null);

  const tree = useMemo(() => buildFileTree(files), [files]);

  useEffect(() => {
    const allFolders = new Set<string>();
    const collectFolders = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        if (n.isFolder) {
          allFolders.add(n.path);
          collectFolders(n.children);
        }
      });
    };
    collectFolders(tree);
    setExpandedFolders(allFolders);
  }, [tree]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ node, x: e.clientX, y: e.clientY });
  };

  const handleDotsClick = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ node, x: rect.left, y: rect.bottom + 4 });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["listProjectFiles", projectId] });
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const isExpanded = expandedFolders.has(node.path);
      return (
        <div key={node.path}>
          <div
            className="file-row w-full flex items-center gap-1.5 px-2 py-1 text-[12px] text-[#8b949e] hover:text-[#e1e4e8] hover:bg-[#1c2333] rounded transition-colors cursor-pointer"
            style={{ paddingInlineStart: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
            onContextMenu={e => handleContextMenu(e, node)}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
            <Folder className={cn("w-3.5 h-3.5 flex-shrink-0", isExpanded ? "text-[#58a6ff]" : "text-[#8b949e]")} />
            <span className="truncate flex-1">{node.name}</span>
            <button
              onClick={e => handleDotsClick(e, node)}
              className="file-dots"
              style={{ opacity: 1, flexShrink: 0, padding: '2px', borderRadius: '4px', fontSize: '14px', lineHeight: 1, color: '#8b949e', background: 'transparent', border: 'none', cursor: 'pointer', minWidth: '18px', textAlign: 'center' }}
            >
              ⋮
            </button>
          </div>
          {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
        </div>
      );
    }

    const isSelected = node.fileIndex === selectedIndex;
    return (
      <div
        key={node.path}
        className={cn(
          "file-row w-full flex items-center gap-1.5 px-2 py-1 text-[12px] rounded transition-colors cursor-pointer",
          isSelected
            ? "bg-[#1f6feb]/15 text-[#e1e4e8]"
            : "text-[#c9d1d9] hover:text-[#e1e4e8] hover:bg-[#1c2333]"
        )}
        style={{ paddingInlineStart: `${depth * 12 + 20}px` }}
        onClick={() => node.fileIndex !== undefined && onFileSelect(node.fileIndex)}
        onContextMenu={e => handleContextMenu(e, node)}
      >
        {getFileIcon(node.name)}
        <span className="truncate flex-1">{node.name}</span>
        <button
          onClick={e => handleDotsClick(e, node)}
          className="file-dots"
          style={{ opacity: 1, flexShrink: 0, padding: '2px', borderRadius: '4px', fontSize: '14px', lineHeight: 1, color: '#8b949e', background: 'transparent', border: 'none', cursor: 'pointer', minWidth: '18px', textAlign: 'center' }}
        >
          ⋮
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length > 0 ? (
          tree.map(node => renderNode(node))
        ) : (
          <div className="text-center text-[#484f58] text-xs mt-8">
            {t.no_files}
          </div>
        )}
      </div>
      {contextMenu && (
        <FileContextMenu
          node={contextMenu.node}
          projectId={projectId}
          files={files}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onRefresh={handleRefresh}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
        />
      )}
    </>
  );
}

function ExecutionLogTimeline({ logs, isBuilding, buildCost, buildTokens }: { logs: ExecutionLog[]; isBuilding: boolean; buildCost?: number; buildTokens?: number }) {
  const { t, lang } = useI18n();
  const logEndRef = React.useRef<HTMLDivElement>(null);
  const agentLabels: Record<string, { en: string; ar: string }> = {
    system: { en: "System", ar: "النظام" },
    planner: { en: "Planner", ar: "المخطط" },
    codegen: { en: "Code Generator", ar: "مولّد الكود" },
    reviewer: { en: "Code Reviewer", ar: "المراجع" },
    fixer: { en: "Code Fixer", ar: "المصلح" },
    surgical_edit: { en: "Editor", ar: "المحرر" },
    package_runner: { en: "Runner", ar: "المشغّل" },
    qa: { en: "QA", ar: "ضمان الجودة" },
    qa_pipeline: { en: "QA", ar: "ضمان الجودة" },
    filemanager: { en: "File Manager", ar: "مدير الملفات" },
  };

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="mt-3 bg-[#0d1117] border border-[#1c2333] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1c2333] bg-[#161b22]">
        <Code2 className="w-3.5 h-3.5 text-[#8b949e]" />
        <span className="text-[11px] font-semibold text-[#e1e4e8] uppercase tracking-wider">{t.execution_log}</span>
        {isBuilding && (
          <span className="flex items-center gap-1 ms-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">LIVE</span>
          </span>
        )}
      </div>

      <div className="max-h-[300px] overflow-y-auto px-3 py-2 space-y-2 font-mono text-[12px]">
        {logs.map((log, i) => {
          const time = log.createdAt ? new Date(log.createdAt).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
          const isCompleted = log.status === "completed" || log.status === "success";
          const isFailed = log.status === "failed" || log.status === "error";
          const isRunning = log.status === "in_progress" || log.status === "running" || log.status === "pending";
          const details = log.details as Record<string, unknown> | null;
          const message = details?.message as string | undefined;
          const agentName = agentLabels[log.agentType || "system"]?.[lang] || log.agentType || "SYSTEM";

          return (
            <motion.div
              key={log.id || i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="group"
            >
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-[#484f58] flex-shrink-0 pt-0.5 tabular-nums">{time}</span>
                <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center mt-0.5">
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : isFailed ? (
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#58a6ff] animate-spin" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#484f58]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-[11px] font-bold me-1.5",
                    isCompleted ? "text-emerald-400" : isFailed ? "text-red-400" : isRunning ? "text-[#58a6ff]" : "text-[#8b949e]"
                  )}>
                    [{agentName}]
                  </span>
                  {message ? (
                    <span className="text-[#c9d1d9] whitespace-pre-wrap leading-relaxed">{message}</span>
                  ) : (
                    <span className="text-[#8b949e]">{log.action}</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {isBuilding ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 py-1"
          >
            <span className="text-[10px] text-[#484f58] flex-shrink-0 tabular-nums">
              {new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <Loader2 className="w-3.5 h-3.5 text-[#58a6ff] animate-spin" />
            <span className="text-[#58a6ff] animate-pulse">
              {lang === "ar" ? "جاري التنفيذ..." : "executing..."}
            </span>
          </motion.div>
        ) : logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 py-2 border-t border-[#1c2333] mt-1"
          >
            {(() => {
              const hasFailed = logs.some(l => l.status === "failed" || l.status === "error");
              const completedCount = logs.filter(l => l.status === "completed" || l.status === "success").length;
              return (
                <>
                  <span className="text-[10px] text-[#484f58] flex-shrink-0 tabular-nums">
                    {logs[logs.length - 1]?.createdAt ? new Date(logs[logs.length - 1].createdAt!).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}
                  </span>
                  {hasFailed ? (
                    <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  )}
                  <span className={cn("text-[11px] font-medium", hasFailed ? "text-red-400" : "text-emerald-400")}>
                    {hasFailed
                      ? (lang === "ar" ? "انتهى مع أخطاء" : "Finished with errors")
                      : (lang === "ar" ? `اكتمل (${completedCount} خطوة)` : `Completed (${completedCount} steps)`)}
                  </span>
                  {buildCost != null && buildCost > 0 && (
                    <span className="text-[10px] text-[#484f58] ms-auto font-mono">
                      ${buildCost.toFixed(4)}{buildTokens ? ` · ${buildTokens.toLocaleString()} ${lang === "ar" ? "توكن" : "tok"}` : ""}
                    </span>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

function DevicePreviewFrame({ device, previewKey, children }: {
  device: { id: string; width: number | null; height: number | null; group: string | null };
  previewKey: number;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!device.width || !containerRef.current) {
      setScale(1);
      return;
    }
    const container = containerRef.current.parentElement;
    if (!container) return;

    const updateScale = () => {
      const cw = container.clientWidth - 32;
      const ch = container.clientHeight - 32;
      const sw = cw / device.width!;
      const sh = ch / device.height!;
      const s = Math.min(sw, sh, 1);
      setScale(Math.round(s * 100) / 100);
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(container);
    return () => ro.disconnect();
  }, [device.width, device.height, previewKey]);

  if (!device.width) {
    return (
      <div className="w-full h-full bg-[#0d1117] overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-[#0d1117]" ref={containerRef}>
      <div
        className="flex-shrink-0 bg-[#161b22] overflow-hidden relative"
        style={{
          width: `${device.width}px`,
          height: `${device.height}px`,
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "center center",
          transition: "transform 300ms ease",
          borderRadius: device.group === "phone" ? "24px" : device.group === "tablet" ? "12px" : "4px",
          boxShadow: "0 0 0 1px #30363d, 0 8px 32px rgba(0,0,0,0.5)",
          border: device.group === "phone" ? "6px solid #21262d" : device.group === "tablet" ? "4px solid #21262d" : "none",
        }}
      >
        {children}
      </div>
      {scale < 1 && (
        <div className="absolute bottom-2 start-2 text-[10px] text-[#484f58] font-mono bg-[#0d1117]/80 px-1.5 py-0.5 rounded">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}

function BuildPanelContent({ logs, isBuilding, buildStatus, buildCost, buildTokens }: { logs: ExecutionLog[]; isBuilding: boolean; buildStatus?: string; buildCost?: number; buildTokens?: number }) {
  const { t, lang } = useI18n();
  const logEndRef = useRef<HTMLDivElement>(null);
  const isRtl = lang === "ar";

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const agentLabels: Record<string, { en: string; ar: string }> = {
    system: { en: "System", ar: "النظام" },
    planner: { en: "Planner", ar: "المخطط" },
    codegen: { en: "Code Generator", ar: "مولّد الكود" },
    reviewer: { en: "Code Reviewer", ar: "المراجع" },
    fixer: { en: "Code Fixer", ar: "المصلح" },
    surgical_edit: { en: "Editor", ar: "المحرر" },
    package_runner: { en: "Runner", ar: "المشغّل" },
    qa: { en: "QA", ar: "ضمان الجودة" },
    qa_pipeline: { en: "QA", ar: "ضمان الجودة" },
    filemanager: { en: "File Manager", ar: "مدير الملفات" },
  };

  const agentSteps = [
    { key: "codegen", ar: "توليد الكود", en: "Code Generation", icon: "⚡" },
    { key: "reviewer", ar: "مراجعة الكود", en: "Code Review", icon: "🔍" },
    { key: "fixer", ar: "إصلاح الأخطاء", en: "Fix Issues", icon: "🔧" },
    { key: "filemanager", ar: "حفظ الملفات", en: "Save Files", icon: "💾" },
    { key: "package_runner", ar: "تثبيت الحزم", en: "Install & Run", icon: "📦" },
    { key: "qa", ar: "فحص الجودة", en: "Quality Check", icon: "✅" },
  ];

  const getStepStatus = (key: string) => {
    const agentKey = key === "qa" ? "qa_pipeline" : key;
    const stepLogs = logs.filter(l => l.agentType === key || l.agentType === agentKey);
    if (stepLogs.length === 0) return "waiting";
    const hasFailed = stepLogs.some(l => l.status === "failed" || l.status === "error");
    const hasCompleted = stepLogs.some(l => l.status === "completed" || l.status === "success");
    if (hasFailed && !hasCompleted) return "failed";
    if (hasCompleted) return "done";
    return "active";
  };

  const completedCount = agentSteps.filter(s => getStepStatus(s.key) === "done").length;
  const activeIdx = agentSteps.findIndex(s => getStepStatus(s.key) === "active");
  const progress = Math.round(((completedCount + (activeIdx >= 0 ? 0.5 : 0)) / agentSteps.length) * 100);

  const generatedFiles = logs
    .filter(l => l.agentType === "codegen" && (l.status === "completed" || l.status === "success"))
    .flatMap(l => {
      const d = l.details as Record<string, unknown> | null;
      const files = d?.files as string[] | undefined;
      return files || [];
    });

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className="p-3 border-b border-[#1c2333] bg-[#161b22]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#e1e4e8] uppercase tracking-wider">
            {isRtl ? "تقدم البناء" : "Build Progress"}
          </span>
          {isBuilding && (
            <span className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58a6ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#58a6ff]"></span>
              </span>
              <span className="text-[10px] font-bold text-[#58a6ff] uppercase">LIVE</span>
            </span>
          )}
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#1c2333] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] rounded-full transition-all duration-700"
            style={{ width: `${buildStatus === "completed" ? 100 : Math.max(progress, 5)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[#484f58]">{buildStatus === "completed" ? 100 : progress}%</span>
          {(buildCost || buildTokens) && (
            <span className="text-[10px] text-[#484f58]">
              {buildTokens ? `${buildTokens.toLocaleString()} tokens` : ""}
              {buildCost ? ` · $${Number(buildCost).toFixed(4)}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="p-2 space-y-0.5">
        {agentSteps.map((step) => {
          const status = getStepStatus(step.key);
          return (
            <div
              key={step.key}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] transition-all",
                status === "active" && "bg-[#1f6feb]/8 border border-[#1f6feb]/20",
                status === "done" && "opacity-60",
                status === "failed" && "opacity-60",
                status === "waiting" && "opacity-30",
              )}
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {status === "active" && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#58a6ff]" />}
                {status === "done" && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                {status === "failed" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                {status === "waiting" && <div className="w-1.5 h-1.5 rounded-full bg-[#30363d]" />}
              </div>
              <span className={cn(
                "flex-1 font-medium",
                status === "active" ? "text-[#e6edf3]" : status === "done" ? "text-[#8b949e]" : status === "failed" ? "text-red-400" : "text-[#484f58]"
              )}>
                {isRtl ? step.ar : step.en}
              </span>
              {status === "active" && (
                <span className="text-[10px] text-[#58a6ff]">{isRtl ? "جاري..." : "..."}</span>
              )}
            </div>
          );
        })}
      </div>

      {generatedFiles.length > 0 && (
        <div className="p-3 border-t border-[#1c2333]">
          <span className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider block mb-2">
            {isRtl ? "الملفات المولّدة" : "Generated Files"} ({generatedFiles.length})
          </span>
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
            {generatedFiles.map((fp, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#c9d1d9] py-0.5 px-2">
                <FileCode2 className="w-3 h-3 text-[#58a6ff] flex-shrink-0" />
                <span className="truncate font-mono">{fp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="p-3 border-t border-[#1c2333]">
          <span className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider block mb-2">
            {isRtl ? "سجل التنفيذ" : "Execution Log"}
          </span>
          <div className="space-y-1 font-mono text-[11px] max-h-[300px] overflow-y-auto">
            {logs.map((log, i) => {
              const time = log.createdAt ? new Date(log.createdAt).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
              const isCompleted = log.status === "completed" || log.status === "success";
              const isFailed = log.status === "failed" || log.status === "error";
              const isRunning = log.status === "in_progress" || log.status === "running";
              const details = log.details as Record<string, unknown> | null;
              const message = details?.message as string | undefined;
              const agentName = agentLabels[log.agentType || "system"]?.[lang] || log.agentType || "SYSTEM";

              return (
                <div key={log.id || i} className="flex items-start gap-1.5">
                  <span className="text-[9px] text-[#484f58] flex-shrink-0 pt-0.5 tabular-nums">{time}</span>
                  <div className="flex-shrink-0 w-3 h-3 flex items-center justify-center mt-0.5">
                    {isCompleted ? (
                      <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : isFailed ? (
                      <svg className="w-2.5 h-2.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : isRunning ? (
                      <Loader2 className="w-2.5 h-2.5 text-[#58a6ff] animate-spin" />
                    ) : (
                      <div className="w-1 h-1 rounded-full bg-[#484f58]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-[10px] font-bold me-1",
                      isCompleted ? "text-emerald-400" : isFailed ? "text-red-400" : isRunning ? "text-[#58a6ff]" : "text-[#8b949e]"
                    )}>
                      [{agentName}]
                    </span>
                    <span className="text-[#8b949e]">{message || log.action}</span>
                  </div>
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

function LiveBuildView({ logs, buildStatus, lang, t }: { logs: ExecutionLog[]; buildStatus?: string; lang: string; t: Record<string, string> }) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const isRtl = lang === "ar";

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const agentSteps = [
    { key: "codegen", ar: "توليد الكود", en: "Generating Code", descAr: "يكتب الملفات والمكونات", descEn: "Writing files & components" },
    { key: "reviewer", ar: "مراجعة الكود", en: "Reviewing Code", descAr: "يفحص الجودة والأخطاء", descEn: "Checking quality & errors" },
    { key: "fixer", ar: "إصلاح الأخطاء", en: "Fixing Issues", descAr: "يصلح المشاكل المكتشفة", descEn: "Fixing detected problems" },
    { key: "filemanager", ar: "حفظ الملفات", en: "Saving Files", descAr: "يحفظ الملفات في المشروع", descEn: "Saving files to project" },
    { key: "package_runner", ar: "تثبيت الحزم", en: "Installing Packages", descAr: "يثبت المكتبات المطلوبة", descEn: "Installing dependencies" },
    { key: "qa", ar: "فحص الجودة", en: "Quality Check", descAr: "يتأكد من عمل الموقع", descEn: "Verifying site works" },
  ];

  const getStepStatus = (key: string) => {
    const stepLogs = logs.filter(l => l.agentType === key);
    if (stepLogs.length === 0) return "waiting";
    const hasFailed = stepLogs.some(l => l.status === "failed" || l.status === "error");
    const hasCompleted = stepLogs.some(l => l.status === "completed" || l.status === "success");
    const last = stepLogs[stepLogs.length - 1];
    if (last.status === "in_progress") return "active";
    if (hasFailed && hasCompleted) return "partial";
    if (hasFailed) return "failed";
    if (hasCompleted) return "done";
    return "active";
  };

  const activeStep = agentSteps.findIndex(s => getStepStatus(s.key) === "active");
  const completedCount = agentSteps.filter(s => getStepStatus(s.key) === "done" || getStepStatus(s.key) === "partial").length;
  const progress = Math.round((completedCount / agentSteps.length) * 100);

  return (
    <div className="h-full flex flex-col items-center justify-center p-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1f6feb]/10 mb-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#58a6ff]" />
          </div>
          <h3 className="text-lg font-semibold text-[#e6edf3]">
            {isRtl ? "جاري البناء..." : "Building..."}
          </h3>
          <div className="w-full h-2 rounded-full bg-[#1c2333] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.max(progress, activeStep >= 0 ? ((activeStep + 0.5) / agentSteps.length) * 100 : 5)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-[#484f58]">{progress}%</p>
        </div>

        <div className="space-y-1">
          {agentSteps.map((step, idx) => {
            const status = getStepStatus(step.key);
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
                  status === "active" && "bg-[#1f6feb]/8 border border-[#1f6feb]/25",
                  status === "done" && "opacity-70",
                  status === "partial" && "opacity-70",
                  status === "failed" && "opacity-70",
                  status === "waiting" && "opacity-30",
                )}
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {status === "active" && <Loader2 className="w-4 h-4 animate-spin text-[#58a6ff]" />}
                  {status === "done" && <Check className="w-4 h-4 text-emerald-400" />}
                  {status === "partial" && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                  {status === "failed" && <XCircle className="w-4 h-4 text-red-400" />}
                  {status === "waiting" && <div className="w-2 h-2 rounded-full bg-[#30363d]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    status === "active" && "text-[#e6edf3]",
                    status === "done" && "text-[#8b949e]",
                    status === "partial" && "text-[#8b949e]",
                    status === "failed" && "text-[#8b949e]",
                    status === "waiting" && "text-[#484f58]",
                  )}>
                    {isRtl ? step.ar : step.en}
                  </p>
                  {status === "active" && (
                    <p className="text-xs text-[#484f58] mt-0.5">{isRtl ? step.descAr : step.descEn}</p>
                  )}
                </div>
                {status === "active" && (
                  <div className="flex-shrink-0">
                    <span className="text-[10px] text-[#58a6ff] animate-pulse">{isRtl ? "جاري..." : "..."}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
