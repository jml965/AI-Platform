// FILE: src/lib/issues-normalizer.ts

export class IssuesNormalizer {

  normalize(issuesRaw: any): Array<{
    severity: "low" | "medium" | "high"
    file?: string
    message: string
  }> {
    if (!Array.isArray(issuesRaw)) {
      return []
    }

    return issuesRaw.map((issue: any) => {
      const severity =
        issue?.severity === "high" ||
        issue?.severity === "medium" ||
        issue?.severity === "low"
          ? issue.severity
          : "low"

      const file =
        typeof issue?.file === "string" && issue.file.trim()
          ? issue.file
          : undefined

      const message =
        typeof issue?.message === "string" && issue.message.trim()
          ? issue.message
          : "Unknown issue"

      return {
        severity,
        file,
        message
      }
    })
  }

}