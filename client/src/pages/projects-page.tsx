import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Trash2, Plus, ArrowRight, Code, Layers, Clock } from "lucide-react";

type ProjectSummary = {
  id: string;
  idea: string;
  options: { appType?: string; tech?: string };
  filesCount: number;
  logsCount: number;
  createdAt: string;
};

const techLabels: Record<string, string> = {
  html: "HTML/CSS/JS",
  react: "React",
  next: "Next.js",
  vue: "Vue.js",
  fastapi: "Python",
  express: "Node.js",
};

const appTypeLabels: Record<string, string> = {
  web: "تطبيق ويب",
  mobile: "موبايل",
  desktop: "سطح المكتب",
  api: "API",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => {
        if (data.success) setProjects(data.projects);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل تريد حذف هذا المشروع؟")) return;
    try {
      const res = await fetch(`/api/project/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white" dir={document.documentElement.dir || "rtl"}>
      <header className="h-14 border-b border-zinc-800 bg-[#0d1320] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            data-testid="btn-back-home"
            onClick={() => navigate("/")}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowRight size={18} />
          </button>
          <span className="text-lg font-bold tracking-tight text-blue-400">مشاريعي</span>
        </div>
        <button
          data-testid="btn-new-project"
          onClick={() => navigate("/")}
          className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          مشروع جديد
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto text-zinc-600 mb-4" />
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">لا توجد مشاريع بعد</h2>
            <p className="text-zinc-500 mb-6">ابدأ بإنشاء مشروعك الأول</p>
            <button
              data-testid="btn-create-first"
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium transition-colors"
            >
              إنشاء مشروع
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                data-testid={`card-project-${project.id}`}
                onClick={() => navigate(`/workspace/${project.id}`)}
                className="group rounded-2xl border border-zinc-800 bg-[#121826] p-5 cursor-pointer hover:border-zinc-600 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-medium text-white truncate mb-2" data-testid={`text-idea-${project.id}`}>
                      {project.idea}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      {project.options?.appType && (
                        <span className="flex items-center gap-1">
                          <Layers size={12} />
                          {appTypeLabels[project.options.appType] || project.options.appType}
                        </span>
                      )}
                      {project.options?.tech && (
                        <span className="flex items-center gap-1">
                          <Code size={12} />
                          {techLabels[project.options.tech] || project.options.tech}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {timeAgo(project.createdAt)}
                      </span>
                      <span>{project.filesCount} ملفات</span>
                    </div>
                  </div>
                  <button
                    data-testid={`btn-delete-${project.id}`}
                    onClick={(e) => handleDelete(project.id, e)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
