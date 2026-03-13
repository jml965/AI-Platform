import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AgentConstitution, checkTokenBudget } from "./constitution";
import type { AgentResult, AgentType, BuildContext } from "./types";

export type AIProvider = "openai" | "anthropic";

export interface ModelConfig {
  provider: AIProvider;
  model: string;
}

export abstract class BaseAgent {
  abstract readonly agentType: AgentType;
  abstract readonly systemPrompt: string;
  abstract readonly modelConfig: ModelConfig;

  protected constitution: AgentConstitution;

  constructor(constitution: AgentConstitution) {
    this.constitution = constitution;
  }

  protected async callLLM(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    context: BuildContext
  ): Promise<{ content: string; tokensUsed: number }> {
    const budget = checkTokenBudget(context.tokensUsedSoFar, this.constitution);
    if (!budget.allowed) {
      throw new Error(`Token budget exhausted. Used: ${context.tokensUsedSoFar}, Limit: ${this.constitution.maxTotalTokensPerBuild}`);
    }

    const estimatedPromptTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    if (estimatedPromptTokens > budget.remaining) {
      throw new Error(`Estimated prompt tokens (${estimatedPromptTokens}) exceed remaining budget (${budget.remaining})`);
    }

    const maxCompletion = Math.min(
      this.constitution.maxTokensPerCall,
      Math.max(1024, budget.remaining - estimatedPromptTokens)
    );

    if (this.modelConfig.provider === "anthropic") {
      return this.callAnthropic(messages, maxCompletion);
    }

    return this.callOpenAI(messages, maxCompletion);
  }

  private async callOpenAI(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    maxCompletion: number
  ): Promise<{ content: string; tokensUsed: number }> {
    const response = await openai.chat.completions.create({
      model: this.modelConfig.model,
      max_completion_tokens: maxCompletion,
      messages,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const usage = response.usage;
    const tokensUsed = (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);

    return { content, tokensUsed };
  }

  private async callAnthropic(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    maxCompletion: number
  ): Promise<{ content: string; tokensUsed: number }> {
    const systemMessage = messages.find(m => m.role === "system");
    const chatMessages = messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [5000, 15000, 30000];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const stream = anthropic.messages.stream({
          model: this.modelConfig.model,
          max_tokens: maxCompletion,
          system: systemMessage?.content,
          messages: chatMessages,
        });

        const response = await stream.finalMessage();

        const content = response.content
          .filter((block: { type: string }) => block.type === "text")
          .map((block: { type: string; text: string }) => block.text)
          .join("");

        const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

        return { content, tokensUsed };
      } catch (error: any) {
        const errorStr = typeof error === "object" ? JSON.stringify(error) : String(error);
        const isRetryable = errorStr.includes("overloaded") || errorStr.includes("529") || errorStr.includes("rate_limit") || errorStr.includes("500") || errorStr.includes("503");

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt] || 30000;
          console.log(`[${this.agentType}] Anthropic overloaded/rate-limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delay / 1000}s`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }

    throw new Error("Max retries exceeded for Anthropic API call");
  }

  abstract execute(context: BuildContext): Promise<AgentResult>;
}
