// FILE: client/src/pages/start-page.tsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { startProject } from "../lib/api";

const appTypes = [
  { key: "web", label: "تطبيق ويب", icon: "🌐" },
  { key: "mobile-web", label: "موبايل ويب", icon: "📱" },
  { key: "android", label: "أندرويد", icon: "🤖" },
  { key: "ios", label: "آيفون", icon: "🍎" },
  { key: "desktop", label: "سطح المكتب", icon: "🖥️" },
  { key: "api", label: "API خدمة", icon: "⚡" },
];

const techStacks = [
  { key: "html-css-js", label: "HTML / CSS / JS" },
  { key: "react", label: "React" },
  { key: "nextjs", label: "Next.js" },
  { key: "vue", label: "Vue.js" },
  { key: "python", label: "Python" },
  { key: "nodejs", label: "Node.js" },
  { key: "flutter", label: "Flutter" },
  { key: "react-native", label: "React Native" },
];

const outputTypes = [
  { key: "website", label: "موقع جاهز", desc: "كود كامل قابل للتشغيل" },
  { key: "plan", label: "خطة مشروع", desc: "هيكلة وتخطيط فقط" },
];

const tabs = [
  { key: "app", label: "تطبيق" },
  { key: "design", label: "تصميم" },
];

export function StartPage() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("app");
  const [selectedAppType, setSelectedAppType] = useState("web");
  const [selectedTech, setSelectedTech] = useState("html-css-js");
  const [selectedOutput, setSelectedOutput] = useState("website");
  const [showMenu, setShowMenu] = useState(false);

  const handleStart = async () => {
    if (!idea.trim() || loading) return;

    try {
      setLoading(true);
      const data = await startProject(idea, {
        tab: activeTab,
        appType: selectedAppType,
        tech: selectedTech,
        output: selectedOutput,
      });
      navigate(`/workspace/${data.projectId}`);
    } catch (error) {
      console.error(error);
      alert("فشل إنشاء المشروع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white flex flex-col" dir="rtl">
      <header className="h-14 border-b border-zinc-800 bg-[#0d1320] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight text-blue-400">منصة البناء الذكي</span>
        </div>

        <div className="relative">
          <button
            data-testid="btn-user-menu"
            onClick={() => setShowMenu(!showMenu)}
            className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold hover:bg-blue-500 transition-colors"
          >
            م
          </button>

          {showMenu && (
            <div className="absolute left-0 top-12 w-52 rounded-xl border border-zinc-700 bg-[#121826] shadow-2xl py-2 z-50">
              <button
                data-testid="menu-account"
                onClick={() => { setShowMenu(false); navigate("/account"); }}
                className="w-full text-right px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                حسابي
              </button>
              <button
                data-testid="menu-projects"
                onClick={() => { setShowMenu(false); navigate("/projects"); }}
                className="w-full text-right px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                سجل الأعمال
              </button>
              <button
                data-testid="menu-apps"
                onClick={() => { setShowMenu(false); navigate("/apps"); }}
                className="w-full text-right px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                تطبيقاتي
              </button>
              <div className="border-t border-zinc-700 my-1" />
              <button
                data-testid="menu-settings"
                onClick={() => { setShowMenu(false); navigate("/settings"); }}
                className="w-full text-right px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                الإعدادات
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              ماذا تريد أن تبني اليوم؟
            </h1>
            <p className="mt-4 text-zinc-400 text-lg">
              اكتب فكرة المشروع واختر الإعدادات ثم ابدأ
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-[#121826] shadow-2xl overflow-hidden">
            <div className="flex border-b border-zinc-800">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  data-testid={`tab-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-[#161d2d] text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs text-zinc-400 mb-2.5 font-medium">نوع التطبيق</label>
                <div className="flex flex-wrap gap-2">
                  {appTypes.map((type) => (
                    <button
                      key={type.key}
                      data-testid={`apptype-${type.key}`}
                      onClick={() => setSelectedAppType(type.key)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        selectedAppType === type.key
                          ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                          : "bg-[#0d1320] border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      <span className="ml-1.5">{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-2.5 font-medium">التقنية / لغة البرمجة</label>
                <div className="flex flex-wrap gap-2">
                  {techStacks.map((tech) => (
                    <button
                      key={tech.key}
                      data-testid={`tech-${tech.key}`}
                      onClick={() => setSelectedTech(tech.key)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        selectedTech === tech.key
                          ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                          : "bg-[#0d1320] border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      {tech.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-2.5 font-medium">نوع المخرج</label>
                <div className="flex gap-3">
                  {outputTypes.map((output) => (
                    <button
                      key={output.key}
                      data-testid={`output-${output.key}`}
                      onClick={() => setSelectedOutput(output.key)}
                      className={`flex-1 p-4 rounded-xl text-right transition-all border ${
                        selectedOutput === output.key
                          ? "bg-blue-600/20 border-blue-500/40"
                          : "bg-[#0d1320] border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <div className={`text-sm font-medium ${selectedOutput === output.key ? "text-blue-300" : "text-zinc-300"}`}>
                        {output.label}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">{output.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                data-testid="input-idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="اكتب فكرة المشروع الذي تريد بناءه..."
                className="w-full h-40 rounded-2xl bg-[#0d1320] border border-zinc-800 p-5 text-lg text-white outline-none resize-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors"
              />

              <div className="flex items-center justify-between">
                <button
                  data-testid="btn-attach"
                  className="h-12 w-12 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                >
                  +
                </button>

                <button
                  data-testid="btn-start"
                  onClick={handleStart}
                  disabled={!idea.trim() || loading}
                  className="px-10 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 font-semibold text-base transition-colors"
                >
                  {loading ? "جاري البدء..." : "ابدأ البناء"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
