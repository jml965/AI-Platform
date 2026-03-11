import type { SecurityHeaderCheck } from "@/types/engine-result";

type SecurityHeadersListProps = {
  headers: SecurityHeaderCheck[];
};

function statusClasses(status: SecurityHeaderCheck['status']) {
  switch (status) {
    case 'present':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'missing':
      return 'bg-red-500/15 text-red-300 border border-red-500/30';
    case 'recommended':
    default:
      return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30';
  }
}

export default function SecurityHeadersList({ headers }: SecurityHeadersListProps) {
  return (
    <div className="space-y-3">
      {headers.map((header) => (
        <div
          key={header.name}
          className="rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClasses(header.status)}`}>
              {header.status.toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-white">
              {header.name}
            </span>
          </div>

          {header.note && (
            <div className="text-sm text-slate-300">
              {header.note}
            </div>
          )}

          {header.recommendedValue && (
            <div className="mt-2 rounded-lg bg-black/20 p-3 text-xs text-slate-300">
              {header.recommendedValue}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
