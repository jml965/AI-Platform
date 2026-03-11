import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ExecutionEvent,
  ExecutionFeedState,
  ExecutionStageKey,
  ExecutionStageState
} from "@/types/execution-log";

type ExecutionFeedProps = {
  feed: ExecutionFeedState | null;
  onRollbackToCheckpoint?: (checkpointId: string) => void;
};

const STAGE_LABELS: Record<ExecutionStageKey, string> = {
  workspace: "تهيئة مساحة العمل",
  intent: "فهم الطلب",
  planning: "التخطيط",
  coding: "كتابة الكود",
  review: "المراجعة",
  repair: "الإصلاح",
  execution: "التنفيذ",
  security: "الأمان",
  devops: "DevOps",
  deployment: "النشر",
  monitoring: "المراقبة",
  done: "الاكتمال"
};

function timeAgo(value?: string) {
  if (!value) return "";
  try {
    const diff = Date.now() - new Date(value).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "الآن";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    return `منذ ${hours} ساعة`;
  } catch {
    return value;
  }
}

function durationText(startedAt?: string, completedAt?: string) {
  if (!startedAt) return "";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 2) return "أقل من ثانية";
  if (seconds < 60) return `${seconds} ثانية`;
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (minutes < 60) return remSec > 0 ? `${minutes} دقيقة و ${remSec} ثانية` : `${minutes} دقيقة`;
  return `${Math.floor(minutes / 60)} ساعة`;
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400" />
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="8" strokeOpacity="0.3" />
      <path d="M6.5 10.5 L9 13 L13.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-5 w-5 animate-spin text-slate-300" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="8" strokeOpacity="0.2" />
      <path d="M10 2a8 8 0 0 1 8 8" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 1h5l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
      <path d="M9 1v4h4" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="8" strokeOpacity="0.3" />
      <path d="M10 7v3M10 13h.01" strokeLinecap="round" />
    </svg>
  );
}

function flattenStageEvents(stages: ExecutionStageState[]): Array<{
  kind: "user-input" | "stage-done" | "working" | "actions" | "text" | "code" | "checkpoint" | "error";
  stage: ExecutionStageKey;
  text: string;
  subText?: string;
  time?: string;
  events?: ExecutionEvent[];
  checkpointId?: string;
  code?: string;
  language?: string;
}> {
  const items: ReturnType<typeof flattenStageEvents> = [];

  for (const stage of stages) {
    if (stage.events.length === 0 && stage.status === "idle") continue;

    const userInputs = stage.events.filter(e => e.type === "user-input");
    for (const ui of userInputs) {
      items.push({ kind: "user-input", stage: stage.key, text: ui.title, time: ui.createdAt });
    }

    const actionEvents = stage.events.filter(e =>
      e.type === "file-open" || e.type === "file-change" || e.type === "code-chunk" ||
      e.type === "fix-applied" || e.type === "review-note" || e.type === "test-result"
    );

    if (actionEvents.length > 0) {
      items.push({
        kind: "actions",
        stage: stage.key,
        text: `${actionEvents.length} إجراء`,
        events: actionEvents,
        time: actionEvents[0]?.createdAt,
      });
    }

    const thoughts = stage.events.filter(e => e.type === "thought" || e.type === "summary" || e.type === "status");
    for (const t of thoughts) {
      if (t.content && t.content.trim()) {
        items.push({ kind: "text", stage: stage.key, text: t.content.trim(), time: t.createdAt });
      }
    }

    const streams = stage.events.filter(e => e.type === "stream");
    for (const s of streams) {
      if (s.content && s.language) {
        items.push({ kind: "code", stage: stage.key, text: s.title, code: s.content, language: s.language, time: s.createdAt });
      } else if (s.content) {
        items.push({ kind: "text", stage: stage.key, text: s.content.trim(), time: s.createdAt });
      }
    }

    const codeChunks = stage.events.filter(e => e.type === "code-chunk" && e.content);
    for (const c of codeChunks) {
      items.push({ kind: "code", stage: stage.key, text: c.filePath || c.title, code: c.content!, language: c.language, time: c.createdAt });
    }

    const errors = stage.events.filter(e => e.type === "error-detected");
    for (const err of errors) {
      items.push({ kind: "error", stage: stage.key, text: err.title, subText: err.content, time: err.createdAt });
    }

    const checkpoints = stage.events.filter(e => e.type === "checkpoint-created");
    for (const cp of checkpoints) {
      items.push({ kind: "checkpoint", stage: stage.key, text: cp.title, checkpointId: cp.checkpointId, time: cp.createdAt });
    }

    if (stage.status === "completed") {
      items.push({
        kind: "stage-done",
        stage: stage.key,
        text: STAGE_LABELS[stage.key] ?? stage.title,
        subText: durationText(stage.startedAt, stage.completedAt),
        time: stage.completedAt,
      });
    } else if (stage.status === "running") {
      items.push({
        kind: "working",
        stage: stage.key,
        text: STAGE_LABELS[stage.key] ?? stage.title,
        subText: durationText(stage.startedAt),
        time: stage.startedAt,
      });
    } else if (stage.status === "failed") {
      items.push({
        kind: "error",
        stage: stage.key,
        text: `فشل: ${STAGE_LABELS[stage.key] ?? stage.title}`,
        time: stage.completedAt,
      });
    }
  }

  return items;
}

export default function ExecutionFeed({
  feed,
  onRollbackToCheckpoint
}: ExecutionFeedProps) {
  const [expandedActions, setExpandedActions] = useState<Record<string, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feed]);

  const items = useMemo(() => {
    if (!feed) return [];
    return flattenStageEvents(feed.stages);
  }, [feed]);

  if (!feed) {
    return (
      <div data-testid="text-no-feed" className="px-4 py-8 text-sm text-slate-500">
        لا يوجد سجل تنفيذ بعد.
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-end" data-testid="execution-feed">
      <div className="space-y-3 px-4 py-4">
        {items.map((item, i) => {
          const key = `${item.stage}-${item.kind}-${i}`;

          if (item.kind === "user-input") {
            return (
              <div key={key} className="flex justify-start" data-testid={`event-user-input-${i}`}>
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600/90 px-4 py-3 text-sm leading-relaxed text-white">
                  {item.text}
                </div>
              </div>
            );
          }

          if (item.kind === "stage-done") {
            return (
              <div key={key} className="flex items-center gap-2.5 py-1" data-testid={`event-stage-done-${item.stage}`}>
                <CheckIcon />
                <span className="text-[13px] text-slate-300">{item.text}</span>
                {item.subText && <span className="text-[12px] text-slate-500">{item.subText}</span>}
              </div>
            );
          }

          if (item.kind === "working") {
            return (
              <div key={key} className="flex items-center gap-2.5 py-1" data-testid={`event-working-${item.stage}`}>
                <SpinnerIcon />
                <span className="text-[13px] text-slate-200">{item.text}</span>
                {item.subText && <span className="text-[12px] text-slate-500">{item.subText}</span>}
              </div>
            );
          }

          if (item.kind === "actions") {
            const isExpanded = expandedActions[key];
            return (
              <div key={key} data-testid={`event-actions-${item.stage}`}>
                <button
                  onClick={() => setExpandedActions(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="flex items-center gap-2 py-1 text-left"
                  data-testid={`btn-expand-actions-${item.stage}`}
                >
                  <div className="flex items-center gap-1">
                    {(item.events || []).slice(0, 6).map((_, ei) => (
                      <FileIcon key={ei} />
                    ))}
                    {(item.events?.length || 0) > 6 && <span className="text-[11px] text-slate-500">+{(item.events?.length || 0) - 6}</span>}
                  </div>
                  <span className="text-[13px] text-slate-400">{item.text}</span>
                </button>
                {isExpanded && item.events && (
                  <div className="mr-2 mt-1 space-y-0.5 border-r border-white/5 pr-3">
                    {item.events.map((ev, ei) => (
                      <div key={ei} className="flex items-center gap-2 py-0.5 text-[12px] text-slate-400">
                        <span className={
                          ev.type === "error-detected" ? "text-red-400" :
                          ev.type === "fix-applied" ? "text-amber-400" :
                          ev.type === "test-result" ? "text-emerald-400" :
                          ev.type === "review-note" ? "text-fuchsia-400" :
                          "text-slate-500"
                        }>
                          {ev.type === "file-open" ? "فتح" :
                           ev.type === "file-change" ? "تعديل" :
                           ev.type === "code-chunk" ? "كود" :
                           ev.type === "fix-applied" ? "إصلاح" :
                           ev.type === "review-note" ? "مراجعة" :
                           ev.type === "test-result" ? (ev.meta?.passed ? "نجح ✓" : "فشل ✕") :
                           "حدث"}
                        </span>
                        <span className="truncate text-slate-300">{ev.filePath || ev.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (item.kind === "text") {
            return (
              <div key={key} className="py-0.5 text-[13px] leading-relaxed text-slate-400" data-testid={`event-text-${i}`}>
                {item.text}
              </div>
            );
          }

          if (item.kind === "code") {
            return (
              <div key={key} className="py-1" data-testid={`event-code-${i}`}>
                <div className="overflow-hidden rounded-lg bg-[#0d1117]">
                  <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-500">
                    <span>{item.text}</span>
                    <span>{item.language}</span>
                  </div>
                  <pre className="overflow-x-auto px-3 pb-3 text-[12px] leading-5 text-slate-300">
                    <code>{item.code}</code>
                  </pre>
                </div>
              </div>
            );
          }

          if (item.kind === "checkpoint") {
            return (
              <div key={key} className="flex items-center gap-2.5 py-1" data-testid={`event-checkpoint-${i}`}>
                <CheckIcon />
                <span className="text-[13px] text-slate-300">{item.text}</span>
                <span className="text-[12px] text-slate-500">{timeAgo(item.time)}</span>
                {item.checkpointId && onRollbackToCheckpoint && (
                  <button
                    data-testid={`btn-rollback-${item.checkpointId}`}
                    onClick={() => onRollbackToCheckpoint(item.checkpointId!)}
                    className="text-[12px] text-slate-400 underline hover:text-white"
                  >
                    استعادة
                  </button>
                )}
              </div>
            );
          }

          if (item.kind === "error") {
            return (
              <div key={key} className="flex items-start gap-2.5 py-1" data-testid={`event-error-${i}`}>
                <div className="mt-0.5 shrink-0"><ErrorIcon /></div>
                <div>
                  <div className="text-[13px] text-red-300">{item.text}</div>
                  {item.subText && <div className="mt-0.5 text-[12px] leading-relaxed text-red-400/70">{item.subText}</div>}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
