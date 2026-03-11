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

type SecurityResultsPanelProps = {
  result: SecurityResult | null;
  monitoring?: SecurityMonitoringResult | null;
  feed?: SecurityFeedEvent[];
  loading?: boolean;
};

export default function SecurityResultsPanel({
  result,
  monitoring = null,
  feed = [],
  loading = false
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
