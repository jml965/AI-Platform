export type LoopStage =
  | "planning"
  | "coding"
  | "review"
  | "execution"
  | "debugging"
  | "repair";

export interface LoopAttempt {
  attempt: number;
  status: "success" | "failed" | "retrying";
  stage: LoopStage;
  error?: string;
  summary?: string;
}

export interface LoopResult<T = any> {
  ok: boolean;
  attempts: LoopAttempt[];
  result?: T;
  finalError?: string;
}
