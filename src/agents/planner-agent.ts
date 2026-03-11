import { buildPlannerMessages } from "../llm/prompt-builder";
import { getPlannerProvider } from "../llm/provider-factory";

type PlanStep = {
  id: string;
  title: string;
  description: string;
};

type PlannerResult = {
  summary: string;
  steps: PlanStep[];
  meta?: Record<string, any>;
};

function fallbackPlan(prompt: string, intent?: any): PlannerResult {
  const label = intent?.type ? ` for ${intent.type}` : "";
  return {
    summary: `Fallback plan${label}: ${prompt}`,
    steps: [
      { id: "step-1", title: "Analyze request", description: "Understand the requested website or app scope." },
      { id: "step-2", title: "Plan structure", description: "Define the page sections and file structure." },
      { id: "step-3", title: "Generate files", description: "Create previewable source files." },
      { id: "step-4", title: "Review output", description: "Check validity and previewability." },
      { id: "step-5", title: "Return result", description: "Send files and metadata to the engine." },
    ],
    meta: {
      provider: "fallback",
      model: "none",
      intent: intent?.type ?? null,
    },
  };
}

function normalizePlan(raw: any, providerMeta?: Record<string, any>): PlannerResult {
  const steps = Array.isArray(raw?.steps)
    ? raw.steps
        .map((step: any, index: number) => ({
          id: typeof step?.id === "string" && step.id.trim() ? step.id : `step-${index + 1}`,
          title: typeof step?.title === "string" && step.title.trim() ? step.title : `Step ${index + 1}`,
          description:
            typeof step?.description === "string" && step.description.trim()
              ? step.description
              : "No description provided.",
        }))
        .filter((step: PlanStep) => step.title.trim().length > 0)
    : [];

  return {
    summary:
      typeof raw?.summary === "string" && raw.summary.trim()
        ? raw.summary
        : "Execution plan generated.",
    steps: steps.length ? steps : fallbackPlan("").steps,
    meta: providerMeta,
  };
}

export class PlannerAgent {
  async run(prompt: string, intent?: any, options?: any): Promise<PlannerResult> {
    const provider = getPlannerProvider();

    const result = await provider.generate({
      messages: buildPlannerMessages(prompt, intent, options),
      maxTokens: 1800,
      temperature: 0.2,
      jsonMode: false,
    });

    if (!result.ok || !result.text) {
      return fallbackPlan(prompt, intent);
    }

    try {
      let textToParse = result.text;
      const jsonMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) textToParse = jsonMatch[1].trim();
      const parsed = JSON.parse(textToParse);
      return normalizePlan(parsed, {
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        intent: intent?.type ?? null,
      });
    } catch {
      return fallbackPlan(prompt, intent);
    }
  }
}
