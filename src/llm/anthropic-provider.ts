import type { LlmGenerateParams, LlmGenerateResult, LlmProvider } from "./types";

function extractAnthropicText(payload: any): string {
  if (!Array.isArray(payload?.content)) return "";

  const parts = payload.content
    .map((item: any) => (item?.type === "text" && typeof item?.text === "string" ? item.text : ""))
    .filter(Boolean);

  return parts.join("\n").trim();
}

export class AnthropicProvider implements LlmProvider {
  readonly provider = "anthropic" as const;
  readonly model: string;

  constructor(model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514") {
    this.model = model;
  }

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async generate(params: LlmGenerateParams): Promise<LlmGenerateResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        text: "",
        provider: "fallback",
        model: this.model,
        error: "ANTHROPIC_API_KEY is missing",
      };
    }

    try {
      const system = params.messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n\n");

      const messages = params.messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": String(process.env.ANTHROPIC_API_KEY),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          system: system || undefined,
          max_tokens: params.maxTokens ?? 3000,
          temperature: params.temperature ?? 0.2,
          messages,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false,
          text: "",
          provider: "anthropic",
          model: this.model,
          error:
            payload?.error?.message ||
            payload?.message ||
            `Anthropic request failed with ${response.status}`,
        };
      }

      const text = extractAnthropicText(payload);

      return {
        ok: Boolean(text),
        text,
        provider: "anthropic",
        model: this.model,
        usage: {
          inputTokens: payload?.usage?.input_tokens,
          outputTokens: payload?.usage?.output_tokens,
          totalTokens:
            (payload?.usage?.input_tokens || 0) +
            (payload?.usage?.output_tokens || 0),
        },
        error: text ? undefined : "Anthropic returned empty text",
      };
    } catch (error: any) {
      return {
        ok: false,
        text: "",
        provider: "anthropic",
        model: this.model,
        error: error?.message || "Unknown Anthropic error",
      };
    }
  }
}
