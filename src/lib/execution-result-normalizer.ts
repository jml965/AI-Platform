// FILE: src/lib/execution-result-normalizer.ts

export class ExecutionResultNormalizer {

  normalize(resultRaw: any): {
    success: boolean
    stdout: string
    stderr: string
    exitCode?: number | null
  } {
    const success = resultRaw?.success === true

    const stdout =
      typeof resultRaw?.stdout === "string"
        ? resultRaw.stdout
        : ""

    const stderr =
      typeof resultRaw?.stderr === "string"
        ? resultRaw.stderr
        : ""

    const exitCode =
      typeof resultRaw?.exitCode === "number" || resultRaw?.exitCode === null
        ? resultRaw.exitCode
        : success
          ? 0
          : 1

    return {
      success,
      stdout,
      stderr,
      exitCode
    }
  }

}