import { getCoderProvider } from "../llm/provider-factory";
import { buildRepairPrompt } from "../engine/repair-prompt-builder";

type GeneratedFile = {
  path: string;
  content: string;
  language?: string;
};

type RepairResult = GeneratedFile[] & {
  meta?: Record<string, any>;
};

function inferLanguage(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith(".html")) return "html";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".js")) return "javascript";
  if (lower.endsWith(".ts")) return "typescript";
  if (lower.endsWith(".tsx")) return "tsx";
  if (lower.endsWith(".json")) return "json";
  return undefined;
}

function normalizeFiles(raw: any): GeneratedFile[] {
  if (!Array.isArray(raw?.files)) return [];

  return raw.files
    .map((file: any) => ({
      path:
        typeof file?.path === "string" && file.path.trim()
          ? file.path.trim()
          : "untitled.txt",
      content: typeof file?.content === "string" ? file.content : "",
      language:
        typeof file?.language === "string" && file.language.trim()
          ? file.language.trim()
          : inferLanguage(String(file?.path || "")),
    }))
    .filter((file: GeneratedFile) => file.path.length > 0);
}

export class RepairAgent {
  async run(input: {
    originalPrompt: string;
    plan?: any;
    intent?: any;
    files: Array<{ path: string; content: string }>;
    review?: any;
    executionError?: string;
    attempt: number;
  }): Promise<RepairResult> {
    const provider = getCoderProvider();

    const result = await provider.generate({
      messages: buildRepairPrompt(input),
      maxTokens: 9000,
      temperature: 0.1,
      jsonMode: false,
    });

    if (!result.ok || !result.text) {
      const fallback = [...input.files] as RepairResult;
      fallback.meta = {
        provider: "fallback",
        model: "none",
        intent: input.intent?.type ?? null,
      };
      return fallback;
    }

    try {
      let textToParse = result.text;
      const jsonMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) textToParse = jsonMatch[1].trim();
      const parsed = JSON.parse(textToParse);
      const files = normalizeFiles(parsed) as RepairResult;

      if (!files.length) {
        const fallback = [...input.files] as RepairResult;
        fallback.meta = {
          provider: "fallback",
          model: "none",
          intent: input.intent?.type ?? null,
        };
        return fallback;
      }

      files.meta = {
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        intent: input.intent?.type ?? null,
      };

      return files;
    } catch {
      const fallback = [...input.files] as RepairResult;
      fallback.meta = {
        provider: "fallback",
        model: "none",
        intent: input.intent?.type ?? null,
      };
      return fallback;
    }
  }
}
