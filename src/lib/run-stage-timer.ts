// FILE: src/lib/run-stage-timer.ts

export type RunStageName =
  | "workspace"
  | "planning"
  | "coding"
  | "fileWrite"
  | "review"
  | "execution"
  | "debug"

export class RunStageTimer {

  private starts = new Map<RunStageName, number>()

  start(stage: RunStageName) {
    this.starts.set(stage, Date.now())
  }

  end(stage: RunStageName) {
    const startedAt = this.starts.get(stage)

    if (!startedAt) {
      return 0
    }

    return Date.now() - startedAt
  }

}