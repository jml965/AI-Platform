import type {
  SecurityFeedEvent,
  SecurityMonitoringResult,
  SecurityResult
} from "@/types/engine-result";
import SecurityScoreBadge from "./security-score-badge";
import SecurityIssuesList from "./security-issues-list";
import SecurityHeadersList from "./security-headers-list";
import SecurityMonitorSummary from "./security-monitor-summary";
import SecurityFeedList from "./security-feed-list";
import { Bot, AlertTriangle, Shield } from "lucide-react";

type AiAnalysis = {
  enhancedIssues: Array<{
    original: string;
    severity: string;
    explanation: string;
    fixSuggestion: string;
    priority: number;
  }>;
  overallRiskLevel: string;
  summary: string;
  recommendations: string[];
  aiModel: string;
};

type SecurityResultsPanelProps = {
  result: SecurityResult | null;
  monitoring?: SecurityMonitoringResult | null;
  feed?: SecurityFeedEvent[];
  loading?: boolean;
  aiAnalysis?: AiAnalysis | null;
};

function riskColor(level: string) {
  if (level === "critical") return "text-red-400 bg-red-500/10 border-red-500/30";
  if (level === "high") return "text-orange-400 bg-orange-500/10 border-orange-500/30";
  if (level === "medium") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  if (level === "low") return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  return "text-green-400 bg-green-500/10 border-green-500/30";
}

function severityColor(severity: string) {
  if (severity === "critical") return "bg-red-500/20 text-red-300";
  if (severity === "high") return "bg-orange-500/20 text-orange-300";
  if (severity === "medium") return "bg-yellow-500/20 text-yellow-300";
  if (severity === "low") return "bg-blue-500/20 text-blue-300";
  return "bg-zinc-500/20 text-zinc-300";
}

export default function SecurityResultsPanel({
  result,
  monitoring = null,
  feed = [],
  loading = false,
  aiAnalysis = null
}: SecurityResultsPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        جاري تنفيذ الفحص الأمني...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        لم يتم تنفيذ فحص أمني بعد.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <SecurityScoreBadge score={result.score} grade={result.grade} />

        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          <div className="rounded-lg bg-black/20 px-3 py-2">Total: {result.summary.totalIssues}</div>
          <div className="rounded-lg bg-black/20 px-3 py-2">Critical: {result.summary.critical}</div>
          <div className="rounded-lg bg-black/20 px-3 py-2">High: {result.summary.high}</div>
          <div className="rounded-lg bg-black/20 px-3 py-2">Medium: {result.summary.medium}</div>
          <div className="rounded-lg bg-black/20 px-3 py-2">Low: {result.summary.low}</div>
        </div>
      </div>

      {aiAnalysis && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Bot size={16} className="text-purple-400" />
            تحليل الذكاء الاصطناعي (Claude Sonnet 4)
          </div>

          <div className={`rounded-xl border p-4 ${riskColor(aiAnalysis.overallRiskLevel)}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} />
              <span className="font-semibold text-sm">مستوى الخطورة: {aiAnalysis.overallRiskLevel}</span>
            </div>
            <p className="text-sm opacity-90" dir="rtl">{aiAnalysis.summary}</p>
          </div>

          {aiAnalysis.recommendations.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white mb-3">التوصيات</div>
              <ul className="space-y-2" dir="rtl">
                {aiAnalysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-purple-400 mt-0.5 shrink-0">{i + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiAnalysis.enhancedIssues.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white mb-3">تحليل مفصل للمشاكل</div>
              <div className="space-y-3">
                {aiAnalysis.enhancedIssues.map((issue, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className="text-yellow-400" />
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs text-zinc-500">الأولوية: {issue.priority}</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-1" dir="rtl">{issue.explanation}</p>
                    <div className="mt-2 rounded bg-black/30 p-2 text-xs text-green-300 font-mono" dir="ltr">
                      {issue.fixSuggestion}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <SecurityMonitorSummary monitoring={monitoring} />

      <div className="space-y-3">
        <div className="text-sm font-semibold text-white">Security Feed</div>
        <SecurityFeedList feed={feed} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-white">Issues</div>
          <SecurityIssuesList issues={result.issues} />
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-white">Headers</div>
          <SecurityHeadersList headers={result.headers} />
        </div>
      </div>
    </div>
  );
}
