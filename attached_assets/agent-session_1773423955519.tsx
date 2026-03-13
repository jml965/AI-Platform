import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { FileTree } from "@/components/file-tree";
import { CodeEditor, getMonacoLanguage } from "@/components/code-editor";
import { AgentExecutionPanel } from "@/components/agent-execution-panel";
import {
  Loader2, ArrowLeft, ArrowRight, Eye, Code2, FolderTree, Monitor,
  Smartphone, Tablet, FileCode, FileText, Rocket, X, Database,
  Globe, Terminal, ChevronDown, RefreshCw, Settings2,
  Send, ExternalLink, Square, FolderOpen, PlayCircle, PanelRightOpen, PanelRightClose, Download,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserDropdownMenu } from "@/components/app-sidebar";
import { useToast } from "@/hooks/use-toast";

type RightTab = "preview" | "code" | "files" | "database" | "publishing" | "console";

interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size: number | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FileWithContent extends ProjectFile {
  content: string | null;
}

interface SessionData {
  id: string;
  projectId: string | null;
  status: string;
  userPrompt: string;
  language: string;
  projectLanguage: string;
  previewPort: number | null;
}

type DeviceCategory = "desktop" | "tablet" | "mobile";

interface DevicePreset {
  id: string;
  name: string;
  category: DeviceCategory;
  width: number;
  height: number;
}

const DEVICE_PRESETS: DevicePreset[] = [
  { id: "desktop", name: "Desktop", category: "desktop", width: 0, height: 0 },
  { id: "macbook-16", name: "MacBook Pro 16\"", category: "desktop", width: 1728, height: 1117 },
  { id: "macbook-14", name: "MacBook Pro 14\"", category: "desktop", width: 1512, height: 982 },
  { id: "macbook-air", name: "MacBook Air 13\"", category: "desktop", width: 1470, height: 956 },
  { id: "imac-24", name: "iMac 24\"", category: "desktop", width: 2048, height: 1152 },
  { id: "surface-laptop", name: "Surface Laptop", category: "desktop", width: 1536, height: 1024 },

  { id: "ipad-pro-13", name: "iPad Pro 12.9\"", category: "tablet", width: 1024, height: 1366 },
  { id: "ipad-pro-11", name: "iPad Pro 11\"", category: "tablet", width: 834, height: 1194 },
  { id: "ipad-air", name: "iPad Air", category: "tablet", width: 820, height: 1180 },
  { id: "ipad-mini", name: "iPad Mini", category: "tablet", width: 768, height: 1024 },
  { id: "surface-pro", name: "Surface Pro", category: "tablet", width: 912, height: 1368 },
  { id: "galaxy-tab-s9", name: "Galaxy Tab S9", category: "tablet", width: 800, height: 1280 },

  { id: "iphone-16-pro-max", name: "iPhone 16 Pro Max", category: "mobile", width: 440, height: 956 },
  { id: "iphone-16-pro", name: "iPhone 16 Pro", category: "mobile", width: 402, height: 874 },
  { id: "iphone-16", name: "iPhone 16", category: "mobile", width: 393, height: 852 },
  { id: "iphone-se", name: "iPhone SE", category: "mobile", width: 375, height: 667 },
  { id: "galaxy-s24-ultra", name: "Galaxy S24 Ultra", category: "mobile", width: 412, height: 915 },
  { id: "galaxy-s24", name: "Galaxy S24", category: "mobile", width: 360, height: 780 },
  { id: "pixel-9-pro", name: "Pixel 9 Pro", category: "mobile", width: 412, height: 915 },
  { id: "pixel-9", name: "Pixel 9", category: "mobile", width: 412, height: 892 },
];

export default function AgentSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { t, isRTL } = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [sessionProjectId, setSessionProjectId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);
  const [showFileSidebar, setShowFileSidebar] = useState(false);

  const [splitPos, setSplitPos] = useState(38);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const { data: session, refetch: refetchSession } = useQuery<SessionData>({
    queryKey: ["/api/agent/sessions", id],
    enabled: !!id,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (session?.projectId && !sessionProjectId) {
      setSessionProjectId(session.projectId);
    }
  }, [session?.projectId, sessionProjectId]);

  const { data: files = [] } = useQuery<ProjectFile[]>({
    queryKey: ["/api/projects", sessionProjectId, "files"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!sessionProjectId,
    refetchInterval: session && !["complete", "failed", "cancelled"].includes(session.status) ? 5000 : 15000,
  });

  const { data: selectedFile } = useQuery<FileWithContent>({
    queryKey: ["/api/projects", sessionProjectId, "files", selectedFileId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedFileId && !!sessionProjectId,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", `/api/agent/sessions/${id}/cancel`); },
    onSuccess: () => {
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ["/api/agent/sessions"] });
    },
    onError: () => { toast({ title: t("agent.cancelError"), variant: "destructive" }); },
  });

  const startPreviewMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", `/api/agent/sessions/${id}/preview/start`); },
    onSuccess: () => { refetchSession(); },
    onError: () => { toast({ title: t("agent.preview.startError"), variant: "destructive" }); },
  });

  const isAgentWorking = session && ["planning", "executing", "reviewing", "verifying", "previewing"].includes(session.status);
  const isAwaitingApproval = session?.status === "awaiting_approval";
  const isComplete = session?.status === "complete";
  const showActionButtons = isComplete && !!sessionProjectId;

  const followUpMutation = useMutation({
    mutationFn: async (message: string) => {
      await apiRequest("POST", `/api/agent/sessions/${id}/follow-up`, { message });
    },
    onSuccess: () => {
      setChatInput("");
      refetchSession();
    },
    onError: (error: any) => {
      toast({ title: t("agent.followUpError"), description: error?.message || "", variant: "destructive" });
    },
  });

  const handleSendChat = () => {
    const msg = chatInput.trim();
    if (!msg || isAgentWorking || followUpMutation.isPending) return;
    followUpMutation.mutate(msg);
  };

  const invalidateFiles = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects", sessionProjectId, "files"] });
  };

  const createFileMutation = useMutation({
    mutationFn: async ({ name, parentPath, isDirectory }: { name: string; parentPath: string; isDirectory: boolean }) => {
      await apiRequest("POST", `/api/projects/${sessionProjectId}/files`, {
        name, path: parentPath || undefined, isDirectory, content: isDirectory ? undefined : "",
      });
    },
    onSuccess: () => { invalidateFiles(); toast({ title: t("files.success.created") }); },
    onError: () => { toast({ title: t("files.errors.createFailed"), variant: "destructive" }); },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: string; newName: string }) => {
      await apiRequest("PATCH", `/api/projects/${sessionProjectId}/files/${fileId}`, { name: newName });
    },
    onSuccess: () => { invalidateFiles(); toast({ title: t("files.success.renamed") }); },
    onError: () => { toast({ title: t("files.errors.renameFailed"), variant: "destructive" }); },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("DELETE", `/api/projects/${sessionProjectId}/files/${fileId}`);
    },
    onSuccess: (_data, fileId) => {
      invalidateFiles();
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
        setOpenFileTabs(prev => prev.filter(id => id !== fileId));
      }
      toast({ title: t("files.success.deleted") });
    },
    onError: () => { toast({ title: t("files.errors.deleteFailed"), variant: "destructive" }); },
  });

  const saveFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("PUT", `/api/projects/${sessionProjectId}/files/${fileId}/content`, {
        content: fileId === selectedFileId ? editorContent : undefined,
      });
    },
    onSuccess: () => { toast({ title: t("files.saved") }); },
    onError: () => { toast({ title: t("files.errors.saveFailed"), variant: "destructive" }); },
  });

  const handleOpenInSplit = useCallback((fileId: string) => {
    setOpenFileTabs(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
    setSelectedFileId(fileId);
    setRightTab("code");
  }, []);

  const handleDownloadFile = useCallback(async (fileId: string) => {
    if (!sessionProjectId) return;
    const f = files.find(file => file.id === fileId);
    if (!f) return;
    try {
      const res = await fetch(`/api/projects/${sessionProjectId}/files/${fileId}`, { credentials: "include" });
      const data = await res.json();
      const blob = new Blob([data.content || ""], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = f.name; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }, [sessionProjectId, files]);

  const [downloadingProject, setDownloadingProject] = useState(false);
  const handleDownloadProject = useCallback(async () => {
    if (!sessionProjectId) return;
    setDownloadingProject(true);
    try {
      const res = await fetch(`/api/projects/${sessionProjectId}/export?format=zip`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("content-disposition");
      const filenameMatch = disposition?.match(/filename="?(.+?)"?$/);
      a.href = url;
      a.download = filenameMatch?.[1] || "project.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: t("files.errors.saveFailed"), variant: "destructive" });
    } finally {
      setDownloadingProject(false);
    }
  }, [sessionProjectId, toast, t]);

  const handleDuplicateFile = useCallback(async (fileId: string) => {
    if (!sessionProjectId) return;
    const f = files.find(file => file.id === fileId);
    if (!f) return;
    try {
      const res = await fetch(`/api/projects/${sessionProjectId}/files/${fileId}`, { credentials: "include" });
      const data = await res.json();
      const pathParts = f.path.split("/");
      const nameParts = f.name.split(".");
      const ext = nameParts.length > 1 ? "." + nameParts.pop() : "";
      const baseName = nameParts.join(".");
      const newName = `${baseName}-copy${ext}`;
      const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";
      await apiRequest("POST", `/api/projects/${sessionProjectId}/files`, {
        name: newName, path: parentPath || undefined, isDirectory: false, content: data.content || "",
      });
      invalidateFiles();
      toast({ title: t("files.success.created") });
    } catch {
      toast({ title: t("files.errors.createFailed"), variant: "destructive" });
    }
  }, [sessionProjectId, files, toast, t]);

  useEffect(() => {
    if (selectedFile?.content !== null && selectedFile?.content !== undefined) {
      setEditorContent(selectedFile.content);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (files.length > 0 && !selectedFileId) {
      const firstFile = files.find(f => !f.isDirectory);
      if (firstFile) {
        setSelectedFileId(firstFile.id);
        setOpenFileTabs([firstFile.id]);
      }
    }
  }, [files, selectedFileId]);

  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
    setRightTab("code");
    setOpenFileTabs(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
  }, []);

  const handleCloseFileTab = useCallback((fileId: string) => {
    setOpenFileTabs(prev => {
      const next = prev.filter(id => id !== fileId);
      if (selectedFileId === fileId && next.length > 0) {
        setSelectedFileId(next[next.length - 1]);
      } else if (next.length === 0) {
        setSelectedFileId(null);
      }
      return next;
    });
  }, [selectedFileId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = isRTL ? rect.right - e.clientX : e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setSplitPos(Math.max(25, Math.min(75, percent)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isRTL]);

  if (!id) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6" data-testid="session-not-found">
        <p className="text-muted-foreground">{t("agent.errors.sessionNotFound")}</p>
        <Button variant="outline" onClick={() => navigate("/create")} className="mt-4" data-testid="button-back-dashboard">
          {isRTL ? <ArrowRight className="h-4 w-4 me-2" /> : <ArrowLeft className="h-4 w-4 me-2" />}
          {t("dashboard.title")}
        </Button>
      </div>
    );
  }

  const hasProject = !!sessionProjectId;
  const projectLang = session?.projectLanguage || "javascript";
  const projectName = session?.userPrompt ? session.userPrompt.slice(0, 30) + (session.userPrompt.length > 30 ? "..." : "") : t("agent.title");
  const nonDirFiles = files.filter(f => !f.isDirectory);

  const topTabs: { key: RightTab; icon: typeof Eye; labelKey: string }[] = [
    { key: "preview", icon: Eye, labelKey: "workspace.preview" },
    { key: "database", icon: Database, labelKey: "workspace.database" },
    { key: "publishing", icon: Globe, labelKey: "workspace.publishing" },
    { key: "console", icon: Terminal, labelKey: "workspace.console" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full bg-background" data-testid="page-agent-session">

      <div className="flex items-center border-b border-border shrink-0 bg-card/80" data-testid="toolbar-tabs">
        <div className="px-2 border-e border-border shrink-0">
          <UserDropdownMenu />
        </div>
        <button
          onClick={() => { if (hasProject && nonDirFiles.length > 0) setRightTab("code"); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-e border-border shrink-0 transition-colors ${
            rightTab === "code" || rightTab === "files" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-project-name"
        >
          <FileText className="h-3 w-3 text-muted-foreground" />
          <span className="truncate max-w-[160px]">{projectName}</span>
        </button>

        {topTabs.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            onClick={() => setRightTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-e border-border shrink-0 ${
              rightTab === key
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
            data-testid={`tab-${key}`}
          >
            <Icon className="h-3 w-3" />
            {t(labelKey)}
            {rightTab === key && (
              <X className="h-3 w-3 ms-1 opacity-40 hover:opacity-100" />
            )}
          </button>
        ))}

        <div className="flex-1" />

        {showActionButtons && (
          <div className="flex items-center gap-1.5 pe-2">
            <Button
              size="sm"
              variant="default"
              className="h-7 rounded-md text-[11px] px-3 gap-1.5"
              onClick={() => startPreviewMutation.mutate()}
              disabled={startPreviewMutation.isPending || !!session?.previewPort}
              data-testid="button-toolbar-start-preview"
            >
              {startPreviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
              {t("agent.preview.start")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-md text-[11px] px-3 gap-1.5"
              onClick={() => navigate(`/project/${sessionProjectId}`)}
              data-testid="button-toolbar-open-project"
            >
              <FolderOpen className="h-3 w-3" />
              {t("agent.openProject")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-md text-[11px] px-3 gap-1.5"
              onClick={handleDownloadProject}
              disabled={downloadingProject}
              data-testid="button-toolbar-download-project"
            >
              {downloadingProject ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {downloadingProject ? t("agent.downloadingProject") : t("agent.downloadProject")}
            </Button>
          </div>
        )}

        <div className="flex items-center gap-1 pe-2">
          {hasProject && (
            <Button
              size="sm"
              className="h-7 text-xs rounded-md"
              data-testid="button-publish"
              onClick={() => setRightTab("publishing")}
            >
              <Rocket className="h-3 w-3 me-1" />
              {t("workspace.publish")}
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div ref={containerRef} className="flex-1 flex overflow-hidden min-h-0" data-testid="workspace-split">

        <div className="flex flex-col overflow-hidden border-e border-border" style={{ width: `${splitPos}%` }} data-testid="panel-left">
          <div className="flex-1 overflow-y-auto min-h-0">
            <AgentExecutionPanel
              sessionId={id}
              onProjectCreated={(projectId) => setSessionProjectId(projectId)}
            />
          </div>

          <div className="border-t border-border bg-card/50 p-2 shrink-0" data-testid="chat-input-area">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                placeholder={t("workspace.chatPlaceholder")}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                disabled={!!isAgentWorking || followUpMutation.isPending}
                data-testid="input-chat"
              />
              {isAgentWorking ? (
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium"
                  data-testid="button-stop-agent"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Square className="h-3 w-3 fill-current" />
                  )}
                  {t("agent.stopAgent")}
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  {isAwaitingApproval && (
                    <button
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                      className="p-1 text-destructive/70 hover:text-destructive transition-colors"
                      data-testid="button-stop-agent-approval"
                      title={t("agent.stopAgent")}
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || followUpMutation.isPending}
                    className="p-1 text-primary hover:text-primary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    data-testid="button-send-chat"
                  >
                    {followUpMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 px-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Settings2 className="h-3 w-3" />
                <span>{t("workspace.build")}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="w-1 shrink-0 cursor-col-resize flex items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors group"
          onMouseDown={handleMouseDown}
          data-testid="split-handle"
        >
          <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary/30 group-active:bg-primary/50 transition-colors" />
        </div>

        <div className="flex-1 flex overflow-hidden" data-testid="panel-right">

          {showFileSidebar && hasProject && files.length > 0 && (
            <div className="w-56 border-e border-border bg-card/30 flex flex-col overflow-hidden shrink-0" data-testid="panel-file-sidebar">
              <FileTree
                files={files}
                selectedFileId={selectedFileId}
                onSelectFile={(fileId) => { handleSelectFile(fileId); setRightTab("code"); }}
                onCreateFile={(name, parentPath, isDir) => {
                  if (name) createFileMutation.mutate({ name, parentPath, isDirectory: isDir });
                }}
                onRenameFile={(fileId, newName) => renameFileMutation.mutate({ fileId, newName })}
                onDeleteFile={(fileId) => deleteFileMutation.mutate(fileId)}
                onDownloadFile={handleDownloadFile}
                onDuplicateFile={handleDuplicateFile}
                onSaveFile={(fileId) => saveFileMutation.mutate(fileId)}
                onOpenInSplit={handleOpenInSplit}
                showExtendedMenu={true}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">

          {rightTab === "preview" && (
            <div className="flex-1 flex flex-col" data-testid="panel-preview">
              <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/50 bg-card/30 shrink-0">
                <button
                  onClick={() => setShowFileSidebar(!showFileSidebar)}
                  className={`p-1 rounded transition-colors ${showFileSidebar ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid="button-toggle-file-sidebar"
                >
                  {showFileSidebar ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                </button>
                <button
                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                  onClick={() => { try { previewIframeRef.current?.contentWindow?.history.back(); } catch {} }}
                  data-testid="button-nav-back"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                  onClick={() => { try { previewIframeRef.current?.contentWindow?.history.forward(); } catch {} }}
                  data-testid="button-nav-forward"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                  onClick={() => { try { previewIframeRef.current?.contentWindow?.location.reload(); } catch { if (previewIframeRef.current) previewIframeRef.current.src = previewIframeRef.current.src; } }}
                  data-testid="button-nav-reload"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
                <div className="flex-1 mx-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/30 text-xs text-muted-foreground" data-testid="url-bar">
                    <Globe className="h-3 w-3 shrink-0" />
                    <span>{session?.previewPort ? `localhost:${session.previewPort}` : t("workspace.loading")}</span>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setDeviceMenuOpen(!deviceMenuOpen)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors text-xs"
                    data-testid="button-device-selector"
                  >
                    {(() => {
                      const d = DEVICE_PRESETS.find(p => p.id === previewDevice);
                      const cat = d?.category || "desktop";
                      return cat === "desktop" ? <Monitor className="h-3 w-3" /> : cat === "tablet" ? <Tablet className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />;
                    })()}
                    <span className="hidden sm:inline text-[11px]">{DEVICE_PRESETS.find(p => p.id === previewDevice)?.name || t("workspace.devices.desktop")}</span>
                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${deviceMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {deviceMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDeviceMenuOpen(false)} />
                      <div className="absolute top-full end-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto" data-testid="device-menu">
                        {(["desktop", "tablet", "mobile"] as DeviceCategory[]).map(cat => (
                          <div key={cat}>
                            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              {cat === "desktop" ? <Monitor className="h-3 w-3" /> : cat === "tablet" ? <Tablet className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                              {cat === "desktop" ? t("workspace.devices.desktop") : cat === "tablet" ? t("workspace.devices.tablet") : t("workspace.devices.mobile")}
                            </div>
                            {DEVICE_PRESETS.filter(d => d.category === cat).map(device => (
                              <button
                                key={device.id}
                                onClick={() => { setPreviewDevice(device.id); setDeviceMenuOpen(false); }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] hover:bg-accent cursor-pointer transition-colors ${previewDevice === device.id ? "bg-accent/50 text-foreground" : "text-foreground/80"}`}
                                data-testid={`device-${device.id}`}
                              >
                                <span>{device.name}</span>
                                {device.width > 0 && <span className="text-[10px] text-muted-foreground tabular-nums">{device.width}x{device.height}</span>}
                              </button>
                            ))}
                            {cat !== "mobile" && <div className="border-t border-border/50 my-0.5" />}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center bg-muted/10 p-4 overflow-hidden relative" ref={(el) => {
                if (el && previewDevice !== "desktop") {
                  const d = DEVICE_PRESETS.find(p => p.id === previewDevice);
                  if (d && d.width > 0) {
                    const cw = el.clientWidth - 32;
                    const ch = el.clientHeight - 32;
                    const sx = cw / d.width;
                    const sy = ch / d.height;
                    const s = Math.min(sx, sy, 1);
                    const frame = el.querySelector("[data-testid='preview-frame']") as HTMLElement;
                    if (frame) {
                      frame.style.width = `${d.width}px`;
                      frame.style.height = `${d.height}px`;
                      frame.style.transform = s < 1 ? `scale(${s})` : "";
                      frame.style.transformOrigin = "center center";
                    }
                  }
                }
              }}>
                <div
                  className={`bg-background border border-border rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 ${previewDevice === "desktop" ? "w-full h-full" : ""}`}
                  style={previewDevice === "desktop" ? undefined : (() => {
                    const d = DEVICE_PRESETS.find(p => p.id === previewDevice);
                    return d && d.width > 0 ? { width: `${d.width}px`, height: `${d.height}px` } : {};
                  })()}
                  data-testid="preview-frame"
                >
                  {session?.previewPort ? (
                    <iframe
                      ref={previewIframeRef}
                      src={`/proxy/${session.previewPort}/`}
                      className="w-full h-full border-0"
                      title="Preview"
                      data-testid="preview-iframe"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Eye className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">{t("workspace.noPreview")}</p>
                      <p className="text-xs mt-1 opacity-60">{t("workspace.noPreviewDesc")}</p>
                      {hasProject && nonDirFiles.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 text-xs"
                          onClick={() => setRightTab("code")}
                          data-testid="button-view-code-instead"
                        >
                          <Code2 className="h-3 w-3 me-1" />
                          {t("workspace.code")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {rightTab === "code" && (
            <div className="flex-1 flex flex-col overflow-hidden" data-testid="panel-code">
              {hasProject && nonDirFiles.length > 0 ? (
                <>
                  {openFileTabs.length > 0 && (
                    <div className="flex items-center border-b border-border/40 bg-card/30 shrink-0 overflow-x-auto">
                      {openFileTabs.map(tabId => {
                        const f = files.find(file => file.id === tabId);
                        if (!f) return null;
                        return (
                          <div
                            key={tabId}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer border-e border-border/30 shrink-0 ${
                              selectedFileId === tabId ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => setSelectedFileId(tabId)}
                            data-testid={`file-tab-${f.name}`}
                          >
                            <FileCode className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span dir="ltr">{f.name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCloseFileTab(tabId); }}
                              className="ms-1 p-0.5 rounded hover:bg-muted"
                              data-testid={`close-tab-${f.name}`}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex-1 flex overflow-hidden">
                    <div className="w-48 border-e border-border/40 bg-card/30 overflow-y-auto shrink-0" data-testid="panel-file-tree-inline">
                      <FileTree
                        files={files}
                        selectedFileId={selectedFileId}
                        onSelectFile={handleSelectFile}
                        onCreateFile={(name, parentPath, isDir) => {
                          if (name) createFileMutation.mutate({ name, parentPath, isDirectory: isDir });
                        }}
                        onRenameFile={(fileId, newName) => renameFileMutation.mutate({ fileId, newName })}
                        onDeleteFile={(fileId) => deleteFileMutation.mutate(fileId)}
                        onDownloadFile={handleDownloadFile}
                        onDuplicateFile={handleDuplicateFile}
                        onSaveFile={(fileId) => saveFileMutation.mutate(fileId)}
                        onOpenInSplit={handleOpenInSplit}
                        showExtendedMenu={true}
                      />
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {selectedFileId && selectedFile && !selectedFile.isDirectory ? (
                        <>
                          <div className="flex items-center gap-2 px-3 py-1 border-b border-border/40 bg-card/30 text-xs shrink-0">
                            <FileCode className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground flex-1" dir="ltr" data-testid="text-open-file-path">{selectedFile.path}</span>
                            {hasProject && (
                              <button
                                onClick={() => navigate(`/project/${sessionProjectId}`)}
                                className="p-1 text-muted-foreground hover:text-foreground rounded"
                                title={t("agent.openProject")}
                                data-testid="button-open-in-editor"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <CodeEditor
                            value={editorContent}
                            onChange={(v) => setEditorContent(v)}
                            language={getMonacoLanguage(selectedFile.name, projectLang)}
                            readOnly={true}
                          />
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <FileCode className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">{t("workspace.selectFile")}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Code2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{t("workspace.noPreview")}</p>
                    <p className="text-xs mt-1 opacity-60">{t("workspace.noPreviewDesc")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {rightTab === "files" && (
            <div className="flex-1 flex flex-col overflow-hidden" data-testid="panel-files">
              {hasProject && files.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">{t("workspace.allFiles")}</h2>
                    <span className="text-xs text-muted-foreground">{nonDirFiles.length} {t("workspace.filesCount")}</span>
                  </div>
                  <FileTree
                    files={files}
                    selectedFileId={selectedFileId}
                    onSelectFile={handleSelectFile}
                    onCreateFile={(name, parentPath, isDir) => {
                      if (name) createFileMutation.mutate({ name, parentPath, isDirectory: isDir });
                    }}
                    onRenameFile={(fileId, newName) => renameFileMutation.mutate({ fileId, newName })}
                    onDeleteFile={(fileId) => deleteFileMutation.mutate(fileId)}
                    onDownloadFile={handleDownloadFile}
                    onDuplicateFile={handleDuplicateFile}
                    onSaveFile={(fileId) => saveFileMutation.mutate(fileId)}
                    onOpenInSplit={handleOpenInSplit}
                    showExtendedMenu={true}
                  />
                  {hasProject && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => navigate(`/project/${sessionProjectId}`)}
                        data-testid="button-open-full-editor"
                      >
                        <ExternalLink className="h-3 w-3 me-1.5" />
                        {t("agent.openProject")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs mt-2"
                        onClick={handleDownloadProject}
                        disabled={downloadingProject}
                        data-testid="button-download-project"
                      >
                        {downloadingProject ? <Loader2 className="h-3 w-3 me-1.5 animate-spin" /> : <Download className="h-3 w-3 me-1.5" />}
                        {downloadingProject ? t("agent.downloadingProject") : t("agent.downloadProject")}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center py-20">
                    <FolderTree className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{t("workspace.noPreview")}</p>
                    <p className="text-xs mt-1 opacity-60">{t("workspace.noPreviewDesc")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {rightTab === "database" && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground" data-testid="panel-database">
              <div className="text-center">
                <Database className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">{t("workspace.database")}</p>
                <p className="text-xs mt-1 opacity-60">{t("workspace.noPreviewDesc")}</p>
              </div>
            </div>
          )}

          {rightTab === "publishing" && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground" data-testid="panel-publishing">
              <div className="text-center">
                <Globe className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">{t("workspace.publishing")}</p>
                <p className="text-xs mt-1 opacity-60">{t("workspace.noPreviewDesc")}</p>
                {hasProject && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={() => navigate(`/project/${sessionProjectId}`)}
                    data-testid="button-publish-go-project"
                  >
                    <ExternalLink className="h-3 w-3 me-1" />
                    {t("agent.openProject")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {rightTab === "console" && (
            <div className="flex-1 flex flex-col overflow-hidden" data-testid="panel-console">
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-card/30 shrink-0">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{t("workspace.console")}</span>
              </div>
              <div className="flex-1 bg-black/90 p-3 font-mono text-xs text-green-400 overflow-y-auto">
                <p className="text-muted-foreground/50">$ {t("workspace.chatPlaceholder")}</p>
                {session?.status === "complete" && (
                  <p className="text-green-500 mt-1">
                    {t("agent.status.complete")} - {nonDirFiles.length} {t("workspace.filesCount")}
                  </p>
                )}
                {session?.status === "executing" && (
                  <p className="text-yellow-500 mt-1 animate-pulse">
                    {t("agent.status.executing")}...
                  </p>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
