import { buildReviewerMessages } from "../llm/prompt-builder";
import { getReviewerProvider } from "../llm/provider-factory";

type ReviewIssue = {
  level: "error" | "warning" | "info";
  message: string;
  file?: string;
};

type ReviewerResult = {
  issues: ReviewIssue[];
  summary: string;
  errorCount: number;
  warningCount: number;
  meta?: Record<string, any>;
};

function fallbackReview(files: Array<{ path: string; content: string }>): ReviewerResult {
  const issues: ReviewIssue[] = [];

  for (const file of files) {
    if (!file?.content || file.content.trim().length < 10) {
      issues.push({
        level: "warning",
        message: "File content is very short.",
        file: file?.path,
      });
    }
  }

  return {
    issues,
    summary: issues.length ? "Fallback review completed with warnings." : "Fallback review passed.",
    errorCount: issues.filter((item) => item.level === "error").length,
    warningCount: issues.filter((item) => item.level === "warning").length,
    meta: {
      provider: "fallback",
      model: "none",
    },
  };
}

function normalizeReview(raw: any, meta?: Record<string, any>): ReviewerResult {
  const issues = Array.isArray(raw?.issues)
    ? raw.issues.map((issue: any) => ({
        level:
          issue?.level === "error" || issue?.level === "warning" || issue?.level === "info"
            ? issue.level
            : "info",
        message:
          typeof issue?.message === "string" && issue.message.trim()
            ? issue.message
            : "Review note.",
        file: typeof issue?.file === "string" ? issue.file : undefined,
      }))
    : [];

  return {
    issues,
    summary:
      typeof raw?.summary === "string" && raw.summary.trim()
        ? raw.summary
        : "Review completed.",
    errorCount: issues.filter((item: ReviewIssue) => item.level === "error").length,
    warningCount: issues.filter((item: ReviewIssue) => item.level === "warning").length,
    meta,
  };
}

export class ReviewerAgent {
  async run(files: Array<{ path: string; content: string }>, intent?: any): Promise<ReviewerResult> {
    const provider = getReviewerProvider();

    const result = await provider.generate({
      messages: buildReviewerMessages(files, intent),
      maxTokens: 2200,
      temperature: 0.1,
      jsonMode: false,
    });

    console.log("[ReviewerAgent]", { ok: result.ok, provider: result.provider, model: result.model, error: result.error });

    if (!result.ok || !result.text) {
      return fallbackReview(files);
    }

    try {
      let textToParse = result.text;
      const jsonMatch = textToParse.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        textToParse = jsonMatch[1].trim();
      }
      const parsed = JSON.parse(textToParse);
      return normalizeReview(parsed, {
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      });
    } catch {
      return {
        ...fallbackReview(files),
        meta: {
          provider: result.provider,
          model: result.model,
          usage: result.usage,
        }
      };
    }
  }
}
