export type ExecutionStageKey =
  | "workspace"
  | "intent"
  | "planning"
  | "coding"
  | "review"
  | "repair"
  | "execution"
  | "security"
  | "devops"
  | "deployment"
  | "monitoring"
  | "done";

export type ExecutionEventType =
  | "stage-start"
  | "stage-complete"
  | "thought"
  | "stream"
  | "file-open"
  | "file-change"
  | "code-chunk"
  | "error-detected"
  | "fix-applied"
  | "review-note"
  | "test-result"
  | "search"
  | "checkpoint-created"
  | "summary"
  | "status"
  | "user-input";

export interface ExecutionEvent {
  id: string;
  stage: ExecutionStageKey;
  type: ExecutionEventType;
  title: string;
  content?: string;
  filePath?: string;
  language?: string;
  lineStart?: number;
  lineEnd?: number;
  createdAt: string;
  meta?: Record<string, string | number | boolean | null>;
  checkpointId?: string;

  streamId?: string;
  isStreaming?: boolean;
  streamMode?: "append" | "replace";
  finalized?: boolean;
}

export interface ExecutionStageState {
  key: ExecutionStageKey;
  title: string;
  status: "idle" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  collapsed: boolean;
  events: ExecutionEvent[];
}

export interface ExecutionFeedState {
  projectId: string;
  runId?: string;
  activeStage?: ExecutionStageKey;
  stages: ExecutionStageState[];
}
