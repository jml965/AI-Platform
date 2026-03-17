import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AgentConstitution, checkTokenBudget } from "./constitution";
import type { AgentResult, AgentType, BuildContext } from "./types";
import { getAgentConfig, updateAgentStats } from "./governor";

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

  private _overrideModel: ModelConfig | null = null;
  private _overridePrompt: string | null = null;
  private _overrideCreativity: number | null = null;
  private _overrideTimeoutSeconds: number | null = null;
  private _overrideMaxTokens: number | null = null;

  constructor(constitution: AgentConstitution) {
    this.constitution = constitution;
  }

  async loadConfigFromDB(): Promise<void> {
    try {
      const config = await getAgentConfig(this.agentType);
      if (config && config.enabled) {
        const pm = config.primaryModel as any;
        if (pm && pm.provider && pm.model && pm.provider !== "local") {
          this._overrideModel = { provider: pm.provider as AIProvider, model: pm.model };
          if (typeof pm.creativity === "number") this._overrideCreativity = pm.creativity;
          if (typeof pm.timeoutSeconds === "number") this._overrideTimeoutSeconds = pm.timeoutSeconds;
          if (typeof pm.maxTokens === "number") this._overrideMaxTokens = pm.maxTokens;
        }
        if (config.systemPrompt && config.systemPrompt.trim().length > 20) {
          this._overridePrompt = config.systemPrompt;
        }
      }
    } catch (err) {
      // Silently fall back to defaults
    }
  }

  protected getEffectiveModel(): ModelConfig {
    return this._overrideModel || this.modelConfig;
  }

  protected getEffectivePrompt(): string {
    return this._overridePrompt || this.systemPrompt;
  }

  protected getEffectiveCreativity(): number | undefined {
    return this._overrideCreativity ?? undefined;
  }

  protected getEffectiveTimeoutMs(): number {
    return (this._overrideTimeoutSeconds ?? 240) * 1000;
  }

  protected getEffectiveMaxTokens(): number | undefined {
    return this._overrideMaxTokens ?? undefined;
  }

  protected async trackStats(tokensUsed: number, success: boolean, durationMs: number, costUsd: number) {
    await updateAgentStats(this.agentType, tokensUsed, success, durationMs, costUsd);
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

    const effectiveModel = this.getEffectiveModel();

    if (effectiveModel.provider === "anthropic") {
      return this.callAnthropic(messages, maxCompletion, effectiveModel);
    }

    return this.callOpenAI(messages, maxCompletion, effectiveModel);
  }

  private async callOpenAI(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    maxCompletion: number,
    modelCfg?: ModelConfig
  ): Promise<{ content: string; tokensUsed: number }> {
    const cfg = modelCfg || this.getEffectiveModel();
    const temperature = this.getEffectiveCreativity();
    const response = await openai.chat.completions.create({
      model: cfg.model,
      max_completion_tokens: maxCompletion,
      ...(temperature !== undefined ? { temperature } : {}),
      messages,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const usage = response.usage;
    const tokensUsed = (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);

    return { content, tokensUsed };
  }

  private async callAnthropic(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    maxCompletion: number,
    modelCfg?: ModelConfig
  ): Promise<{ content: string; tokensUsed: number }> {
    const cfg = modelCfg || this.getEffectiveModel();
    const systemMessage = messages.find(m => m.role === "system");
    const chatMessages = messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [5000, 15000, 30000];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const temperature = this.getEffectiveCreativity();
        const stream = anthropic.messages.stream({
          model: cfg.model,
          max_tokens: maxCompletion,
          ...(temperature !== undefined ? { temperature } : {}),
          system: systemMessage?.content,
          messages: chatMessages,
        });

        const timeoutMs = this.getEffectiveTimeoutMs();
        const response = await Promise.race([
          stream.finalMessage(),
          new Promise<never>((_, reject) =>
            setTimeout(() => {
              stream.abort();
              reject(new Error("Anthropic API call timed out after 4 minutes"));
            }, timeoutMs)
          ),
        ]);

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
