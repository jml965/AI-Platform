import type { ExecutionFeedState, ExecutionEvent } from "../types/execution-log";

export function ExecutionFeedView({ feed }: { feed?: ExecutionFeedState }) {
  if (!feed?.stages?.length) return null;
  return null;
}
