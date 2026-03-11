import type { LoopAttempt, LoopResult } from "./loop-types";

export class LoopController {
  private readonly maxAttempts: number;
  private attempts: LoopAttempt[] = [];

  constructor(maxAttempts = 3) {
    this.maxAttempts = maxAttempts;
  }

  addAttempt(attempt: LoopAttempt) {
    this.attempts.push(attempt);
  }

  canRetry(currentAttempt: number): boolean {
    return currentAttempt < this.maxAttempts;
  }

  shouldRetry(params: {
    executionFailed?: boolean;
    reviewErrorCount?: number;
  }): boolean {
    if (params.executionFailed) return true;
    if ((params.reviewErrorCount || 0) > 0) return true;
    return false;
  }

  success<T>(result: T): LoopResult<T> {
    return {
      ok: true,
      attempts: this.attempts,
      result,
    };
  }

  fail(finalError: string): LoopResult {
    return {
      ok: false,
      attempts: this.attempts,
      finalError,
    };
  }
}
