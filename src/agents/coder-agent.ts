import { buildCoderMessages } from "../llm/prompt-builder";
import { getCoderProvider } from "../llm/provider-factory";

type GeneratedFile = {
  path: string;
  content: string;
  language?: string;
};

type CoderResult = GeneratedFile[] & {
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

function fallbackFiles(prompt: string, intent?: any): CoderResult {
  const files = [
    {
      path: "src/app.ts",
      content: `console.log(${JSON.stringify(`Fallback generated for: ${prompt} [intent=${intent?.type || "general"}]`)});`,
      language: "typescript",
    },
  ] as CoderResult;

  files.meta = {
    provider: "fallback",
    model: "none",
    intent: intent?.type ?? null,
  };

  return files;
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

export class CoderAgent {
  async run(prompt: string, plan?: any, intent?: any, options?: any): Promise<CoderResult> {
    const provider = getCoderProvider();

    const result = await provider.generate({
      messages: buildCoderMessages(prompt, plan, intent, options),
      maxTokens: 32000,
      temperature: 0.2,
      jsonMode: false,
    });

    if (!result.ok || !result.text) {
      return fallbackFiles(prompt, intent);
    }

    try {
      let textToParse = result.text;
      const jsonMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) textToParse = jsonMatch[1].trim();
      const parsed = JSON.parse(textToParse);
      const files = normalizeFiles(parsed) as CoderResult;

      if (!files.length) {
        return fallbackFiles(prompt, intent);
      }

      files.meta = {
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        intent: intent?.type ?? null,
      };

      return files;
    } catch {
      return fallbackFiles(prompt, intent);
    }
  }
}
