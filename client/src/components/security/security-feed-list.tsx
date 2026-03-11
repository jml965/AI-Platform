import type { SecurityFeedEvent } from "@/types/engine-result";

type SecurityFeedListProps = {
  feed?: SecurityFeedEvent[];
};

function eventClasses(type: SecurityFeedEvent["type"]) {
  switch (type) {
    case "security-first-run":
      return "bg-blue-500/10 border border-blue-500/20 text-blue-200";
    case "security-improved":
      return "bg-emerald-500/10 border border-emerald-500/20 text-emerald-200";
    case "security-regressed":
      return "bg-red-500/10 border border-red-500/20 text-red-200";
    case "security-unchanged":
    default:
      return "bg-slate-500/10 border border-slate-500/20 text-slate-200";
  }
}

export default function SecurityFeedList({ feed = [] }: SecurityFeedListProps) {
  if (!feed.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        لا توجد أحداث مراقبة أمنية بعد.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feed.map((event) => (
        <div
          key={event.id}
          className={`rounded-xl p-4 ${eventClasses(event.type)}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              {event.title}
            </div>
            <div className="text-xs opacity-80">
              {new Date(event.timestamp).toLocaleString()}
            </div>
          </div>

          <div className="mt-2 text-sm opacity-90">
            {event.message}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-black/20 px-2 py-1">
              Score: {event.score}
            </span>
            <span className="rounded-md bg-black/20 px-2 py-1">
              Grade: {event.grade}
            </span>
            <span className="rounded-md bg-black/20 px-2 py-1">
              Delta: {event.scoreDelta > 0 ? `+${event.scoreDelta}` : event.scoreDelta}
            </span>
            <span className="rounded-md bg-black/20 px-2 py-1">
              New: {event.newIssuesCount}
            </span>
            <span className="rounded-md bg-black/20 px-2 py-1">
              Resolved: {event.resolvedIssuesCount}
            </span>
            <span className="rounded-md bg-black/20 px-2 py-1">
              Unchanged: {event.unchangedIssuesCount}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
