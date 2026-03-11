import type { DevopsMonitoringResult } from "@/types/engine-result";

type DevopsMonitorSummaryProps = {
  monitoring?: DevopsMonitoringResult | null;
};

function statusLabel(status: NonNullable<DevopsMonitoringResult["delta"]>["status"]) {
  switch (status) {
    case "first-run":
      return "First Run";
    case "improved":
      return "Improved";
    case "regressed":
      return "Regressed";
    case "unchanged":
    default:
      return "Unchanged";
  }
}

function statusClasses(status: NonNullable<DevopsMonitoringResult["delta"]>["status"]) {
  switch (status) {
    case "first-run":
      return "bg-blue-500/15 text-blue-300 border border-blue-500/30";
    case "improved":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
    case "regressed":
      return "bg-red-500/15 text-red-300 border border-red-500/30";
    case "unchanged":
    default:
      return "bg-slate-500/15 text-slate-300 border border-slate-500/30";
  }
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

export default function DevopsMonitorSummary({ monitoring }: DevopsMonitorSummaryProps) {
  if (!monitoring) return null;

  const { delta, summary } = monitoring;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-lg px-3 py-1 text-sm font-semibold ${statusClasses(delta.status)}`}>
          {statusLabel(delta.status)}
        </span>

        <span className="rounded-lg bg-black/20 px-3 py-1 text-sm text-slate-200">
          Score Delta: {formatDelta(delta.scoreDelta)}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-black/20 p-3">
          <div className="text-xs text-slate-400">Previous Score</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {delta.previousScore ?? "—"}
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-3">
          <div className="text-xs text-slate-400">Current Score</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {delta.currentScore}
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-3">
          <div className="text-xs text-slate-400">Previous Grade</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {delta.previousGrade ?? "—"}
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-3">
          <div className="text-xs text-slate-400">Current Grade</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {delta.currentGrade}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-black/20 p-3">
          <div className="text-xs text-slate-400">New Issues</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {summary.newIssuesCount}
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-3">
          <div className="text-xs text-slate-400">Resolved Issues</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {summary.resolvedIssuesCount}
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-3">
          <div className="text-xs text-slate-400">Unchanged Issues</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {summary.unchangedIssuesCount}
          </div>
        </div>
      </div>

      {delta.status === "first-run" && (
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-200">
          هذه أول نتيجة محفوظة للمقارنة التشغيلية.
        </div>
      )}
    </div>
  );
}
