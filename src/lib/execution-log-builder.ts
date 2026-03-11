import type { ExecutionEvent, ExecutionStageKey, ExecutionEventType } from "../types/execution-log";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class ExecutionLogBuilder {
  static entry(
    stage: ExecutionStageKey,
    type: ExecutionEventType,
    title: string,
    opts?: Partial<Omit<ExecutionEvent, "id" | "type" | "stage" | "title" | "createdAt">>
  ): ExecutionEvent {
    return {
      id: makeId(),
      type,
      stage,
      title,
      createdAt: new Date().toISOString(),
      ...opts,
    };
  }

  static thought(stage: ExecutionStageKey, title: string, content?: string): ExecutionEvent {
    return ExecutionLogBuilder.entry(stage, "thought", title, { content });
  }

  static code(stage: ExecutionStageKey, title: string, content: string, language?: string, filePath?: string): ExecutionEvent {
    return ExecutionLogBuilder.entry(stage, "code-chunk", title, { content, language, filePath });
  }

  static error(stage: ExecutionStageKey, title: string, content?: string): ExecutionEvent {
    return ExecutionLogBuilder.entry(stage, "error-detected", title, { content });
  }

  static fix(stage: ExecutionStageKey, title: string, content?: string, filePath?: string): ExecutionEvent {
    return ExecutionLogBuilder.entry(stage, "fix-applied", title, { content, filePath });
  }

  static file(stage: ExecutionStageKey, title: string, filePath: string, content?: string, language?: string): ExecutionEvent {
    return ExecutionLogBuilder.entry(stage, "file-open", title, { filePath, content, language });
  }

  static summary(stage: ExecutionStageKey, title: string, content?: string): ExecutionEvent {
    return ExecutionLogBuilder.entry(stage, "summary", title, { content });
  }

  static status(stage: ExecutionStageKey, title: string, meta?: Record<string, string | number | boolean | null>): ExecutionEvent {
    return ExecutionLogBuilder.entry(stage, "status", title, { meta });
  }

  static checkpoint(stage: ExecutionStageKey, title: string, checkpointId?: string): ExecutionEvent {
    return ExecutionLogBuilder.entry(stage, "checkpoint-created", title, { checkpointId });
  }
}
