import { BaseAgent, type ModelConfig } from "./base-agent";
import type { AgentResult, BuildContext, ProjectPlan, StoredPlan } from "./types";

const pendingPlans = new Map<string, StoredPlan>();

export function getPendingPlan(buildId: string): StoredPlan | undefined {
  return pendingPlans.get(buildId);
}

export function getAllPendingPlans(userId: string): StoredPlan[] {
  return Array.from(pendingPlans.values()).filter(p => p.userId === userId && p.status === "pending_approval");
}

export function approvePlan(buildId: string): StoredPlan | undefined {
  const plan = pendingPlans.get(buildId);
  if (!plan) return undefined;
  plan.status = "approved";
  pendingPlans.delete(buildId);
  return plan;
}

export function rejectPlan(buildId: string): StoredPlan | undefined {
  const plan = pendingPlans.get(buildId);
  if (!plan) return undefined;
  plan.status = "rejected";
  pendingPlans.delete(buildId);
  return plan;
}

export function modifyPlan(buildId: string, updatedPlan: ProjectPlan): StoredPlan | undefined {
  const plan = pendingPlans.get(buildId);
  if (!plan) return undefined;
  plan.plan = updatedPlan;
  plan.status = "modified";
  return plan;
}

export function removePendingPlan(buildId: string): void {
  pendingPlans.delete(buildId);
}

export function storePendingPlan(stored: StoredPlan): void {
  pendingPlans.set(stored.buildId, stored);
}

const COMPLEXITY_KEYWORDS = [
  "متجر", "e-commerce", "ecommerce", "shop", "store",
  "منصة", "platform", "saas", "dashboard", "لوحة",
  "نظام", "system", "cms", "crm", "erp",
  "تطبيق", "application", "app",
  "موقع كامل", "full website", "multi-page", "متعدد الصفحات",
  "blog", "مدونة", "portfolio", "معرض",
  "booking", "حجز", "reservation",
  "social", "اجتماعي", "forum", "منتدى",
  "marketplace", "سوق",
  "authentication", "مصادقة", "login", "تسجيل",
  "database", "قاعدة بيانات",
  "api", "backend", "خلفية",
  "real-time", "chat", "دردشة",
  "payment", "دفع", "checkout",
];

const SIMPLE_KEYWORDS = [
  "صفحة واحدة", "single page", "landing page", "صفحة هبوط",
  "تعديل", "edit", "fix", "إصلاح", "change", "تغيير",
  "button", "زر", "color", "لون", "font", "خط",
  "update", "تحديث", "tweak", "simple", "بسيط",
  "add a", "أضف",
];

export function classifyComplexity(prompt: string): "complex" | "simple" {
  const lower = prompt.toLowerCase();
  const wordCount = prompt.split(/\s+/).length;

  const simpleScore = SIMPLE_KEYWORDS.filter(k => lower.includes(k)).length;
  const complexScore = COMPLEXITY_KEYWORDS.filter(k => lower.includes(k)).length;

  if (simpleScore > 0 && complexScore === 0) return "simple";
  if (complexScore >= 2) return "complex";
  if (wordCount > 50 && complexScore >= 1) return "complex";
  if (wordCount <= 20 && complexScore <= 1 && simpleScore === 0) return "simple";

  return complexScore > simpleScore ? "complex" : "simple";
}

export class PlannerAgent extends BaseAgent {
  readonly agentType = "planner" as const;
  readonly modelConfig: ModelConfig = { provider: "openai", model: "o3" };

  readonly systemPrompt = `You are a senior software architect AI. Your job is to analyze a project request and produce a structured project plan BEFORE any code is generated.

You must output a JSON object with this exact structure:
{
  "framework": "The main framework/technology to use (e.g. 'HTML/CSS/JS', 'React', 'Next.js')",
  "description": "Brief description of what will be built (English)",
  "descriptionAr": "Brief description of what will be built (Arabic)",
  "directoryStructure": ["list", "of", "directories", "to", "create"],
  "files": ["list", "of", "file", "paths", "to", "generate"],
  "packages": ["list", "of", "npm/cdn", "packages", "needed"],
  "phases": [
    {
      "name": "Phase name (English)",
      "nameAr": "Phase name (Arabic)",
      "description": "What this phase accomplishes (English)",
      "descriptionAr": "What this phase accomplishes (Arabic)",
      "files": ["files", "created", "in", "this", "phase"]
    }
  ]
}

Rules:
- Be specific about file paths, not vague
- List ALL files that will be created
- Organize phases logically (structure first, then core logic, then styling, then polish)
- Keep packages minimal — only what's truly needed
- Support RTL layouts when the user writes in Arabic
- Phases should be 2-5 steps, not more
- Always respond with valid JSON only, no markdown or extra text`;

  async execute(context: BuildContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const { content, tokensUsed } = await this.callLLM(
        [
          { role: "system", content: this.systemPrompt },
          {
            role: "user",
            content: `Analyze this project request and produce a detailed build plan:\n\n${context.prompt}`,
          },
        ],
        context
      );

      const plan = this.parseResponse(content);

      const storedPlan: StoredPlan = {
        buildId: context.buildId,
        projectId: context.projectId,
        userId: context.userId,
        prompt: context.prompt,
        plan,
        status: "pending_approval",
        createdAt: new Date().toISOString(),
      };
      storePendingPlan(storedPlan);

      return {
        success: true,
        tokensUsed,
        durationMs: Date.now() - startTime,
        data: { plan, requiresApproval: true },
      };
    } catch (error) {
      return {
        success: false,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private parseResponse(content: string): ProjectPlan {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Planner did not return valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.framework || !Array.isArray(parsed.files) || !Array.isArray(parsed.phases)) {
      throw new Error("Plan missing required fields: framework, files, or phases");
    }

    return {
      framework: parsed.framework,
      description: parsed.description || "",
      descriptionAr: parsed.descriptionAr || "",
      directoryStructure: parsed.directoryStructure || [],
      files: parsed.files,
      packages: parsed.packages || [],
      phases: parsed.phases.map((p: Record<string, unknown>) => ({
        name: p.name || "",
        nameAr: p.nameAr || "",
        description: p.description || "",
        descriptionAr: p.descriptionAr || "",
        files: Array.isArray(p.files) ? p.files : [],
      })),
    };
  }
}
