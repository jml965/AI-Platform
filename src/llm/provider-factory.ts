import { AnthropicProvider } from "./anthropic-provider";
import { OpenAiProvider } from "./openai-provider";

function getAnthropicOrFallback(model?: string) {
  const anthropic = new AnthropicProvider(model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514");
  if (anthropic.isConfigured()) return anthropic;

  return {
    provider: "fallback" as const,
    model: "fallback",
    isConfigured() {
      return false;
    },
    async generate() {
      return {
        ok: false,
        text: "",
        provider: "fallback" as const,
        model: "fallback",
        error: "ANTHROPIC_API_KEY is missing",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };
    },
  };
}

function getOpenAiOrFallback(model?: string) {
  const openai = new OpenAiProvider(model || process.env.OPENAI_CODER_MODEL || "gpt-4o");
  if (openai.isConfigured()) return openai;

  return {
    provider: "fallback" as const,
    model: "fallback",
    isConfigured() {
      return false;
    },
    async generate() {
      return {
        ok: false,
        text: "",
        provider: "fallback" as const,
        model: "fallback",
        error: "OPENAI_API_KEY is missing",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };
    },
  };
}

export function getPlannerProvider() {
  return getAnthropicOrFallback(
    process.env.ANTHROPIC_PLANNER_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"
  );
}

export function getReviewerProvider() {
  return getAnthropicOrFallback(
    process.env.ANTHROPIC_REVIEWER_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"
  );
}

export function getCoderProvider() {
  return getOpenAiOrFallback(
    process.env.OPENAI_CODER_MODEL || "gpt-5.2"
  );
}
