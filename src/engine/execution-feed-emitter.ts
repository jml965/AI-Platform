import type {
  ExecutionEvent,
  ExecutionFeedState,
  ExecutionStageKey,
  ExecutionStageState
} from "../../client/src/types/execution-log";

const STAGES: ExecutionStageKey[] = [
  "workspace",
  "intent",
  "planning",
  "coding",
  "review",
  "repair",
  "execution",
  "security",
  "devops",
  "deployment",
  "monitoring",
  "done"
];

const STREAM_TO_FINAL_TYPE: Record<string, ExecutionEvent["type"]> = {
  thought: "thought",
  code: "code-chunk",
  error: "error-detected",
  fix: "fix-applied",
  review: "review-note",
  test: "test-result",
  summary: "summary"
};

function createStage(key: ExecutionStageKey): ExecutionStageState {
  return {
    key,
    title: key,
    status: "idle",
    collapsed: false,
    events: []
  };
}

export class ExecutionFeedEmitter {
  private state: ExecutionFeedState;
  private streamMap = new Map<string, { stage: ExecutionStageKey; eventId: string; finalType: ExecutionEvent["type"] }>();

  constructor(
    private readonly projectId: string,
    private readonly publish: (state: ExecutionFeedState) => void
  ) {
    this.state = {
      projectId,
      runId: `${projectId}:${Date.now()}`,
      activeStage: undefined,
      stages: STAGES.map(createStage)
    };
  }

  private clone(): ExecutionFeedState {
    return {
      ...this.state,
      stages: this.state.stages.map((stage) => ({
        ...stage,
        events: [...stage.events]
      }))
    };
  }

  private commit() {
    this.publish(this.clone());
  }

  private getStage(stage: ExecutionStageKey) {
    return this.state.stages.find((s) => s.key === stage);
  }

  private pushEvent(stage: ExecutionStageKey, event: ExecutionEvent) {
    const target = this.getStage(stage);
    if (!target) return;
    target.events.push(event);
    this.commit();
  }

  private patchEvent(stage: ExecutionStageKey, eventId: string, updater: (event: ExecutionEvent) => void) {
    const target = this.getStage(stage);
    if (!target) return;
    const event = target.events.find((e) => e.id === eventId);
    if (!event) return;
    updater(event);
    this.commit();
  }

  startStage(stage: ExecutionStageKey, title?: string) {
    const target = this.getStage(stage);
    if (!target) return;

    if (this.state.activeStage && this.state.activeStage !== stage) {
      const previous = this.getStage(this.state.activeStage);
      if (previous && previous.status === "running") {
        previous.collapsed = true;
      }
    }

    this.state.activeStage = stage;
    target.title = title ?? target.title;
    target.status = "running";
    target.startedAt = new Date().toISOString();
    target.completedAt = undefined;
    target.collapsed = false;

    target.events.push({
      id: `${stage}:stage-start:${Date.now()}`,
      stage,
      type: "stage-start",
      title: title ?? `بدء ${stage}`,
      createdAt: new Date().toISOString()
    });

    this.commit();
  }

  completeStage(stage: ExecutionStageKey, summary?: string) {
    const target = this.getStage(stage);
    if (!target) return;

    if (summary) {
      target.events.push({
        id: `${stage}:summary:${Date.now()}`,
        stage,
        type: "summary",
        title: "ملخص المرحلة",
        content: summary,
        createdAt: new Date().toISOString()
      });
    }

    target.status = "completed";
    target.completedAt = new Date().toISOString();
    target.collapsed = true;

    target.events.push({
      id: `${stage}:stage-complete:${Date.now()}`,
      stage,
      type: "stage-complete",
      title: "اكتملت المرحلة",
      createdAt: new Date().toISOString()
    });

    if (this.state.activeStage === stage) {
      this.state.activeStage = undefined;
    }

    this.commit();
  }

  failStage(stage: ExecutionStageKey, message: string) {
    const target = this.getStage(stage);
    if (!target) return;

    target.status = "failed";
    target.collapsed = false;

    target.events.push({
      id: `${stage}:stage-failed:${Date.now()}`,
      stage,
      type: "error-detected",
      title: "فشل في المرحلة",
      content: message,
      createdAt: new Date().toISOString()
    });

    this.commit();
  }

  fileOpen(stage: ExecutionStageKey, filePath: string) {
    this.pushEvent(stage, {
      id: `${stage}:file-open:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      stage,
      type: "file-open",
      title: "فتح ملف",
      filePath,
      createdAt: new Date().toISOString()
    });
  }

  fileChange(stage: ExecutionStageKey, filePath: string, content?: string) {
    this.pushEvent(stage, {
      id: `${stage}:file-change:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      stage,
      type: "file-change",
      title: "تعديل ملف",
      filePath,
      content,
      createdAt: new Date().toISOString()
    });
  }

  reviewNote(stage: ExecutionStageKey, title: string, content: string, filePath?: string) {
    this.pushEvent(stage, {
      id: `${stage}:review-note:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      stage,
      type: "review-note",
      title,
      content,
      filePath,
      createdAt: new Date().toISOString()
    });
  }

  testResult(stage: ExecutionStageKey, title: string, content: string, passed: boolean) {
    this.pushEvent(stage, {
      id: `${stage}:test-result:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      stage,
      type: "test-result",
      title,
      content,
      createdAt: new Date().toISOString(),
      meta: {
        passed
      }
    });
  }

  checkpoint(stage: ExecutionStageKey, title: string, content: string, checkpointId: string) {
    this.pushEvent(stage, {
      id: `${stage}:checkpoint:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      stage,
      type: "checkpoint-created",
      title,
      content,
      checkpointId,
      createdAt: new Date().toISOString()
    });
  }

  status(stage: ExecutionStageKey, title: string, content?: string, meta?: Record<string, string | number | boolean | null>) {
    this.pushEvent(stage, {
      id: `${stage}:status:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      stage,
      type: "status",
      title,
      content,
      meta,
      createdAt: new Date().toISOString()
    });
  }

  startStream(
    stage: ExecutionStageKey,
    title: string,
    options?: {
      initialContent?: string;
      language?: string;
      filePath?: string;
      finalType?: "thought" | "code" | "error" | "fix" | "review" | "test" | "summary";
      streamMode?: "append" | "replace";
    }
  ) {
    const streamId = `${stage}:stream:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    const eventId = `${streamId}:event`;

    const finalTypeKey = options?.finalType ?? "thought";
    const finalType = STREAM_TO_FINAL_TYPE[finalTypeKey] ?? "thought";

    this.pushEvent(stage, {
      id: eventId,
      stage,
      type: "stream",
      title,
      content: options?.initialContent ?? "",
      language: options?.language,
      filePath: options?.filePath,
      streamId,
      isStreaming: true,
      streamMode: options?.streamMode ?? "append",
      finalized: false,
      createdAt: new Date().toISOString(),
      meta: {
        finalType
      }
    });

    this.streamMap.set(streamId, { stage, eventId, finalType });
    return streamId;
  }

  appendStream(streamId: string, chunk: string) {
    const ref = this.streamMap.get(streamId);
    if (!ref) return;

    this.patchEvent(ref.stage, ref.eventId, (event) => {
      event.content = `${event.content ?? ""}${chunk}`;
      event.isStreaming = true;
    });
  }

  replaceStream(streamId: string, content: string) {
    const ref = this.streamMap.get(streamId);
    if (!ref) return;

    this.patchEvent(ref.stage, ref.eventId, (event) => {
      event.content = content;
      event.isStreaming = true;
    });
  }

  finishStream(streamId: string, finalContent?: string) {
    const ref = this.streamMap.get(streamId);
    if (!ref) return;

    this.patchEvent(ref.stage, ref.eventId, (event) => {
      if (typeof finalContent === "string") {
        event.content = finalContent;
      }
      event.isStreaming = false;
      event.finalized = true;
      event.type = ref.finalType;
    });

    this.streamMap.delete(streamId);
  }
}
