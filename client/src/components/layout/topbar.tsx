import { Monitor, Database, ShieldCheck, TerminalSquare, Globe, Upload, Container, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SecurityButton from "../topbar/security-button";

export type TopbarTab = "preview" | "publishing" | "database" | "security" | "devops" | "console";

type Props = {
  activeTab?: TopbarTab;
  onTabChange?: (tab: TopbarTab) => void;
  projectPath?: string;
};

const tabs: { label: string; id: TopbarTab; icon: typeof Monitor }[] = [
  { label: "Preview", id: "preview", icon: Monitor },
  { label: "Publishing", id: "publishing", icon: Globe },
  { label: "Database", id: "database", icon: Database },
  { label: "Security Scan", id: "security", icon: ShieldCheck },
  { label: "DevOps", id: "devops", icon: Container },
  { label: "Console", id: "console", icon: TerminalSquare }
];

export function Topbar({ activeTab = "preview", onTabChange, projectPath }: Props) {
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-zinc-800 bg-[#0b0f17] flex items-center justify-between px-4">
      <div className="text-lg font-bold">وكيل شخصي مطور</div>

      <div className="hidden md:flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => onTabChange?.(tab.id)}
              className={`h-10 px-4 rounded-xl text-sm flex items-center gap-2 transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {projectPath && <SecurityButton projectPath={projectPath} />}
        {projectPath && (
          <button
            data-testid="btn-export"
            onClick={() => navigate(`/export/${projectPath}`)}
            className="h-10 px-4 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 flex items-center gap-2 transition-colors"
          >
            <Download size={16} />
            تصدير
          </button>
        )}
        <button
          data-testid="btn-invite"
          className="h-10 px-4 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white"
        >
          Invite
        </button>
        <button
          data-testid="btn-publish"
          className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium flex items-center gap-2"
        >
          <Upload size={16} />
          Publish
        </button>
      </div>
    </header>
  );
}
