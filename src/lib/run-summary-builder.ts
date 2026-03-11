// FILE: src/lib/run-summary-builder.ts

export class RunSummaryBuilder {

  build(input: {
    files: Array<{ path: string; content: string }>
    issues: Array<{ severity: "low" | "medium" | "high"; file?: string; message: string }>
    result: { success: boolean; stdout: string; stderr: string; exitCode?: number | null }
    stageDurations: {
      workspace: number
      planning: number
      coding: number
      fileWrite: number
      review: number
      execution: number
      debug: number
    }
  }) {
    const filesGenerated = Array.isArray(input.files) ? input.files.length : 0

    const issuesCount = Array.isArray(input.issues) ? input.issues.length : 0

    const errorCount = Array.isArray(input.issues)
      ? input.issues.filter((issue) => issue.severity === "high").length
      : 0

    const warningCount = Array.isArray(input.issues)
      ? input.issues.filter((issue) => issue.severity === "medium" || issue.severity === "low").length
      : 0

    const executionRuntime: "executed" | "skipped" =
      input.stageDurations.execution > 0 ? "executed" : "skipped"

    const hasDebug = input.stageDurations.debug > 0 || !input.result.success

    return {
      filesGenerated,
      issuesCount,
      errorCount,
      warningCount,
      executionRuntime,
      hasDebug,
      success: input.result.success
    }
  }

}