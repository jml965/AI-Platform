import type { DevopsIssue } from "@/types/engine-result";

type DevopsIssuesListProps = {
  issues: DevopsIssue[];
};

function severityClasses(severity: DevopsIssue['severity']) {
  switch (severity) {
    case 'critical':
      return 'bg-red-600/20 text-red-300 border border-red-500/30';
    case 'high':
      return 'bg-orange-600/20 text-orange-300 border border-orange-500/30';
    case 'medium':
      return 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30';
    case 'low':
      return 'bg-blue-600/20 text-blue-300 border border-blue-500/30';
    case 'info':
    default:
      return 'bg-slate-600/20 text-slate-300 border border-slate-500/30';
  }
}

export default function DevopsIssuesList({ issues }: DevopsIssuesListProps) {
  if (!issues.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        لا توجد مشاكل DevOps مكتشفة.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <div key={issue.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${severityClasses(issue.severity)}`}>
              {issue.severity.toUpperCase()}
            </span>
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300">
              {issue.type}
            </span>
          </div>

          <div className="text-sm font-semibold text-white">{issue.title}</div>
          <div className="mt-1 text-sm text-slate-300">{issue.description}</div>

          {(issue.filePath || issue.line) && (
            <div className="mt-2 text-xs text-slate-400">
              {issue.filePath ?? 'unknown file'}{issue.line ? `:${issue.line}` : ''}
            </div>
          )}

          {issue.recommendation && (
            <div className="mt-3 rounded-lg bg-black/20 p-3 text-sm text-slate-200">
              {issue.recommendation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
