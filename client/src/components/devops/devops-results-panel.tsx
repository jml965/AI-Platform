import type {
  DevopsFeedEvent,
  DevopsFixResult,
  DevopsMonitoringResult,
  DevopsResult
} from "@/types/engine-result";
import DevopsScoreBadge from "./devops-score-badge";
import DevopsIssuesList from "./devops-issues-list";
import DevopsChecksList from "./devops-checks-list";
import DevopsMonitorSummary from "./devops-monitor-summary";
import DevopsFeedList from "./devops-feed-list";

type DevopsResultsPanelProps = {
  result: DevopsResult | null;
  fixResult?: DevopsFixResult | null;
  monitoring?: DevopsMonitoringResult | null;
  feed?: DevopsFeedEvent[];
  loading?: boolean;
};

export default function DevopsResultsPanel({
  result,
  fixResult = null,
  monitoring = null,
  feed = [],
  loading = false
}: DevopsResultsPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        جاري تنفيذ فحص DevOps...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        لم يتم تنفيذ فحص DevOps بعد.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <DevopsScoreBadge score={result.score} grade={result.grade} />

        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          <div className="rounded-lg bg-black/20 px-3 py-2">Total: {result.summary.totalIssues}</div>
          <div className="rounded-lg bg-black/20 px-3 py-2">Critical: {result.summary.critical}</div>
          <div className="rounded-lg bg-black/20 px-3 py-2">High: {result.summary.high}</div>
          <div className="rounded-lg bg-black/20 px-3 py-2">Medium: {result.summary.medium}</div>
          <div className="rounded-lg bg-black/20 px-3 py-2">Low: {result.summary.low}</div>
        </div>
      </div>

      <DevopsMonitorSummary monitoring={monitoring} />

      {fixResult && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="text-sm font-semibold text-white">DevOps Fix Result</div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs text-slate-400">Applied</div>
              <div className="mt-2 space-y-2 text-sm text-slate-200">
                {fixResult.applied.length ? fixResult.applied.map((item) => (
                  <div key={item}>{item}</div>
                )) : <div>لا يوجد</div>}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs text-slate-400">Skipped</div>
              <div className="mt-2 space-y-2 text-sm text-slate-200">
                {fixResult.skipped.length ? fixResult.skipped.map((item) => (
                  <div key={item}>{item}</div>
                )) : <div>لا يوجد</div>}
              </div>
            </div>

            <div className="rounded-xl bg-black/20 p-4">
              <div className="text-xs text-slate-400">Updated Files</div>
              <div className="mt-2 space-y-2 text-sm text-slate-200 break-all">
                {fixResult.updatedFiles.length ? fixResult.updatedFiles.map((item) => (
                  <div key={item}>{item}</div>
                )) : <div>لا يوجد</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="text-sm font-semibold text-white">DevOps Feed</div>
        <DevopsFeedList feed={feed} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-white">Issues</div>
          <DevopsIssuesList issues={result.issues} />
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-white">Checks</div>
          <DevopsChecksList checks={result.checks} />
        </div>
      </div>
    </div>
  );
}
