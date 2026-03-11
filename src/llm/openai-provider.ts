import type { LlmGenerateParams, LlmGenerateResult, LlmProvider } from "./types";

function safeJsonParse<T = any>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractOpenAiText(payload: any): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (Array.isArray(payload?.output)) {
    const parts: string[] = [];

    for (const item of payload.output) {
      if (Array.isArray(item?.content)) {
        for (const content of item.content) {
          if (typeof content?.text === "string") {
            parts.push(content.text);
          }
        }
      }
    }

    if (parts.length) return parts.join("\n").trim();
  }

  if (typeof payload?.choices?.[0]?.message?.content === "string") {
    return payload.choices[0].message.content.trim();
  }

  if (Array.isArray(payload?.choices?.[0]?.message?.content)) {
    const parts = payload.choices[0].message.content
      .map((item: any) => (typeof item?.text === "string" ? item.text : ""))
      .filter(Boolean);

    if (parts.length) return parts.join("\n").trim();
  }

  return "";
}

export class OpenAiProvider implements LlmProvider {
  readonly provider = "openai" as const;
  readonly model: string;

  constructor(model = process.env.OPENAI_CODER_MODEL || "gpt-5.2") {
    this.model = model;
  }

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generate(params: LlmGenerateParams): Promise<LlmGenerateResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        text: "",
        provider: "fallback",
        model: this.model,
        error: "OPENAI_API_KEY is missing",
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: params.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          max_tokens: params.maxTokens ?? 4000,
          temperature: params.temperature ?? 0.2,
          response_format: params.jsonMode ? { type: "json_object" } : undefined,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false,
          text: "",
          provider: "openai",
          model: this.model,
          error:
            payload?.error?.message ||
            payload?.message ||
            `OpenAI request failed with ${response.status}`,
        };
      }

      const text = extractOpenAiText(payload);

      return {
        ok: Boolean(text),
        text,
        provider: "openai",
        model: this.model,
        usage: {
          inputTokens:
            payload?.usage?.input_tokens ??
            payload?.usage?.prompt_tokens,
          outputTokens:
            payload?.usage?.output_tokens ??
            payload?.usage?.completion_tokens,
          totalTokens:
            payload?.usage?.total_tokens ??
            ((payload?.usage?.input_tokens || 0) + (payload?.usage?.output_tokens || 0)),
        },
        error: text ? undefined : "OpenAI returned empty text",
      };
    } catch (error: any) {
      return {
        ok: false,
        text: "",
        provider: "openai",
        model: this.model,
        error: error?.message || "Unknown OpenAI error",
      };
    }
  }
}

export function parseJsonFromOpenAiText<T = any>(text: string): T | null {
  return safeJsonParse<T>(text);
}
