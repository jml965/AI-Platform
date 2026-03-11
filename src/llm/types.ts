export type LlmRole = "system" | "user" | "assistant";

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmGenerateParams {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LlmGenerateResult {
  ok: boolean;
  text: string;
  provider: "openai" | "anthropic" | "fallback";
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  error?: string;
}

export interface LlmProvider {
  readonly provider: "openai" | "anthropic";
  readonly model: string;
  isConfigured(): boolean;
  generate(params: LlmGenerateParams): Promise<LlmGenerateResult>;
}
