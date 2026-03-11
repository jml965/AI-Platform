import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Download, FileText, FolderOpen, Copy, Check, Github, ExternalLink, Loader2 } from "lucide-react";

type ExportFile = {
  path: string;
  size: number;
  content: string;
};

type PushResult = {
  success: boolean;
  message: string;
  commitUrl?: string;
  repoUrl?: string;
  filesCount?: number;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filePath: string) {
  if (filePath.endsWith(".html")) return "🌐";
  if (filePath.endsWith(".css")) return "🎨";
  if (filePath.endsWith(".js") || filePath.endsWith(".ts")) return "⚡";
  if (filePath.endsWith(".json")) return "📋";
  if (filePath === "Dockerfile") return "🐳";
  return "📄";
}

export function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<ExportFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [pushingGithub, setPushingGithub] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubRepo, setGithubRepo] = useState("jml965/AI-Platform");
  const [githubBranch, setGithubBranch] = useState("main");
  const [commitMessage, setCommitMessage] = useState("");

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/project/${projectId}/export/files`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.files.length > 0) {
          setFiles(data.files);
          setSelectedFile(data.files[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      setCommitMessage(`تحديث ملفات المشروع ${projectId.slice(0, 8)}`);
    }
  }, [projectId]);

  const handleDownload = async () => {
    if (!projectId || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/project/${projectId}/export`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${projectId.slice(0, 8)}.tar.gz`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("فشل تحميل الملف");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedFile) return;
    try {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Copy failed");
    }
  };

  const handlePushGithub = async () => {
    if (!projectId || pushingGithub) return;
    setPushingGithub(true);
    setPushResult(null);
    try {
      const res = await fetch(`/api/project/${projectId}/push-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: githubRepo,
          branch: githubBranch,
          commitMessage: commitMessage || undefined,
        }),
      });
      const data: PushResult = await res.json();
      setPushResult(data);
    } catch (err: any) {
      setPushResult({ success: false, message: err.message || "فشل الاتصال بالخادم" });
    } finally {
      setPushingGithub(false);
    }
  };

  const dir = document.documentElement.dir || "rtl";

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white flex flex-col" dir={dir}>
      <header className="h-14 border-b border-zinc-800 bg-[#0d1320] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            data-testid="btn-back"
            onClick={() => navigate(-1)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowRight size={18} />
          </button>
          <span className="text-lg font-bold tracking-tight text-blue-400">
            تصدير المشروع
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="btn-push-github"
            onClick={() => setShowGithubModal(true)}
            disabled={files.length === 0}
            className="h-9 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-40 text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Github size={16} />
            رفع إلى GitHub
          </button>
          <button
            data-testid="btn-download-tar"
            onClick={handleDownload}
            disabled={downloading || files.length === 0}
            className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Download size={16} />
            {downloading ? "جاري التحميل..." : "تحميل tar.gz"}
          </button>
        </div>
      </header>

      {showGithubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-[#121826] p-6 shadow-2xl" dir={dir}>
            <div className="flex items-center gap-3 mb-6">
              <Github size={24} className="text-white" />
              <h2 className="text-lg font-semibold">رفع إلى GitHub</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">المستودع (owner/repo)</label>
                <input
                  data-testid="input-github-repo"
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="jml965/AI-Platform"
                  className="w-full h-11 rounded-xl bg-[#0d1320] border border-zinc-800 px-4 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">الفرع</label>
                <input
                  data-testid="input-github-branch"
                  type="text"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  className="w-full h-11 rounded-xl bg-[#0d1320] border border-zinc-800 px-4 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">رسالة الكوميت</label>
                <input
                  data-testid="input-commit-message"
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full h-11 rounded-xl bg-[#0d1320] border border-zinc-800 px-4 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="text-xs text-zinc-500">
                سيتم رفع {files.length} ملفات إلى المستودع
              </div>

              {pushResult && (
                <div className={`rounded-xl p-4 text-sm ${
                  pushResult.success
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/20 text-red-300"
                }`}>
                  <p>{pushResult.message}</p>
                  {pushResult.success && pushResult.commitUrl && (
                    <a
                      href={pushResult.commitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-blue-400 hover:text-blue-300 underline"
                      data-testid="link-commit-url"
                    >
                      <ExternalLink size={12} />
                      عرض الكوميت على GitHub
                    </a>
                  )}
                  {pushResult.success && pushResult.repoUrl && (
                    <a
                      href={pushResult.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 mr-3 text-blue-400 hover:text-blue-300 underline"
                      data-testid="link-repo-url"
                    >
                      <ExternalLink size={12} />
                      فتح المستودع
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                data-testid="btn-confirm-push"
                onClick={handlePushGithub}
                disabled={pushingGithub || !githubRepo.trim()}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {pushingGithub ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <Github size={16} />
                    رفع الملفات
                  </>
                )}
              </button>
              <button
                data-testid="btn-cancel-push"
                onClick={() => { setShowGithubModal(false); setPushResult(null); }}
                className="h-11 px-5 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:text-white transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FolderOpen size={48} className="mx-auto text-zinc-600 mb-4" />
              <h2 className="text-xl font-semibold text-zinc-300 mb-2">لا توجد ملفات</h2>
              <p className="text-zinc-500 mb-4">قم بتشغيل المشروع أولاً لإنشاء الملفات</p>
              <button
                data-testid="btn-go-workspace"
                onClick={() => navigate(`/workspace/${projectId}`)}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium transition-colors"
              >
                الذهاب لمساحة العمل
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-64 shrink-0 border-l border-zinc-800 bg-[#0d1320] overflow-y-auto">
              <div className="p-3 text-xs text-zinc-500 font-medium">
                ملفات المشروع ({files.length})
              </div>
              {files.map((file, i) => (
                <button
                  key={i}
                  data-testid={`btn-file-${i}`}
                  onClick={() => { setSelectedFile(file); setCopied(false); }}
                  className={`w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    selectedFile?.path === file.path
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  }`}
                >
                  <span>{getFileIcon(file.path)}</span>
                  <span className="flex-1 truncate">{file.path}</span>
                  <span className="text-[10px] text-zinc-600">{formatSize(file.size)}</span>
                </button>
              ))}

              <div className="p-3 mt-4 border-t border-zinc-800">
                <div className="text-xs text-zinc-500 mb-2">إجمالي الحجم</div>
                <div className="text-sm text-zinc-300">
                  {formatSize(files.reduce((sum, f) => sum + f.size, 0))}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedFile && (
                <>
                  <div className="h-10 border-b border-zinc-800 bg-[#0d1320] px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <FileText size={14} />
                      <span>{selectedFile.path}</span>
                      <span className="text-xs text-zinc-600">{formatSize(selectedFile.size)}</span>
                    </div>
                    <button
                      data-testid="btn-copy-file"
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      {copied ? "تم النسخ" : "نسخ"}
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto bg-[#0a0e14]">
                    <pre className="p-4 text-[13px] leading-6 text-slate-300 whitespace-pre-wrap break-words" dir="ltr">
                      <code>{selectedFile.content}</code>
                    </pre>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
