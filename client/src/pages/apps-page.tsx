import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Globe, ExternalLink, Box } from "lucide-react";

type AppSummary = {
  id: string;
  idea: string;
  options: { appType?: string; tech?: string };
  createdAt: string;
};

export function AppsPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => {
        if (data.success) setApps(data.projects);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white" dir={document.documentElement.dir || "rtl"}>
      <header className="h-14 border-b border-zinc-800 bg-[#0d1320] px-6 flex items-center gap-3 shrink-0">
        <button
          data-testid="btn-back-home"
          onClick={() => navigate("/")}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowRight size={18} />
        </button>
        <span className="text-lg font-bold tracking-tight text-blue-400">تطبيقاتي</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <Box size={48} className="mx-auto text-zinc-600 mb-4" />
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">لا توجد تطبيقات منشورة</h2>
            <p className="text-zinc-500 mb-6">أنشئ مشروعاً وانشره ليظهر هنا</p>
            <button
              data-testid="btn-go-create"
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium transition-colors"
            >
              إنشاء مشروع
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {apps.map((app) => (
              <div
                key={app.id}
                data-testid={`card-app-${app.id}`}
                className="rounded-2xl border border-zinc-800 bg-[#121826] p-5 hover:border-zinc-600 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0">
                    <Globe size={18} />
                  </div>
                  <button
                    data-testid={`btn-open-app-${app.id}`}
                    onClick={() => navigate(`/workspace/${app.id}`)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
                <h3 className="text-sm font-medium text-white truncate mb-1" data-testid={`text-app-idea-${app.id}`}>
                  {app.idea}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">
                    نشط
                  </span>
                  {app.options?.tech && <span>{app.options.tech}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
