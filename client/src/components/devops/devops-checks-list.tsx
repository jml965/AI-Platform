import type { DevopsCheckItem } from "@/types/engine-result";

type DevopsChecksListProps = {
  checks: DevopsCheckItem[];
};

function statusClasses(status: DevopsCheckItem['status']) {
  switch (status) {
    case 'pass':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'warn':
      return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30';
    case 'fail':
      return 'bg-red-500/15 text-red-300 border border-red-500/30';
    case 'info':
    default:
      return 'bg-slate-500/15 text-slate-300 border border-slate-500/30';
  }
}

export default function DevopsChecksList({ checks }: DevopsChecksListProps) {
  return (
    <div className="space-y-3">
      {checks.map((check) => (
        <div key={check.key} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClasses(check.status)}`}>
              {check.status.toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-white">{check.label}</span>
          </div>

          {check.note && (
            <div className="text-sm text-slate-300">{check.note}</div>
          )}
        </div>
      ))}
    </div>
  );
}
