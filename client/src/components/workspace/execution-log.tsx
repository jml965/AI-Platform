import { useEffect, useRef } from "react";
import ExecutionFeed from "../execution-feed";
import type { ExecutionFeedState } from "../../types/execution-log";

type Props = {
  projectId: string;
  executionFeed?: ExecutionFeedState;
};

export function ExecutionLog({ projectId, executionFeed }: Props) {
  const hasStages = executionFeed?.stages && executionFeed.stages.some(
    (s) => s.status !== "idle" || s.events.length > 0
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [executionFeed?.stages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto p-3 flex flex-col">
      <div className="mt-auto">
        {hasStages ? (
          <ExecutionFeed feed={executionFeed ?? null} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
              <span className="text-zinc-500 text-lg">&#9654;</span>
            </div>
            <p data-testid="empty-log" className="text-sm text-zinc-500">
              أدخل أمراً لبدء التنفيذ
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
