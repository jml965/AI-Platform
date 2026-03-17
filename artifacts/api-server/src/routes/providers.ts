import { Router } from "express";
import { db } from "@workspace/db";
import { aiProvidersTable, providerUsageLogsTable, agentConfigsTable } from "@workspace/db/schema";
import { eq, desc, sql, gte } from "drizzle-orm";

const router = Router();

const DEFAULT_PROVIDERS = [
  {
    providerKey: "openai",
    displayName: "OpenAI",
    displayNameAr: "أوبن إيه آي",
    logo: "https://cdn.openai.com/API/logo-assets/openai-logomark.png",
    website: "https://openai.com",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o", name: "GPT-4o", maxTokens: 128000, inputCostPer1k: 0.005, outputCostPer1k: 0.015 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", maxTokens: 128000, inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 },
      { id: "o3", name: "o3", maxTokens: 200000, inputCostPer1k: 0.01, outputCostPer1k: 0.04 },
      { id: "o4-mini", name: "o4 Mini", maxTokens: 200000, inputCostPer1k: 0.001, outputCostPer1k: 0.004 },
    ],
    priority: 1,
  },
  {
    providerKey: "anthropic",
    displayName: "Anthropic",
    displayNameAr: "أنثروبيك",
    logo: "https://anthropic.com/favicon.ico",
    website: "https://anthropic.com",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", maxTokens: 200000, inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", maxTokens: 200000, inputCostPer1k: 0.015, outputCostPer1k: 0.075 },
      { id: "claude-haiku-3-5", name: "Claude 3.5 Haiku", maxTokens: 200000, inputCostPer1k: 0.0008, outputCostPer1k: 0.004 },
    ],
    priority: 2,
  },
  {
    providerKey: "google",
    displayName: "Google (Gemini)",
    displayNameAr: "جوجل (جيميناي)",
    logo: "https://www.google.com/favicon.ico",
    website: "https://ai.google.dev",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", maxTokens: 1000000, inputCostPer1k: 0.00125, outputCostPer1k: 0.01 },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", maxTokens: 1000000, inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", maxTokens: 1000000, inputCostPer1k: 0.0001, outputCostPer1k: 0.0004 },
    ],
    priority: 3,
  },
  {
    providerKey: "mistral",
    displayName: "Mistral AI",
    displayNameAr: "ميسترال",
    logo: "https://mistral.ai/favicon.ico",
    website: "https://mistral.ai",
    apiKeyUrl: "https://console.mistral.ai/api-keys",
    models: [
      { id: "mistral-large", name: "Mistral Large", maxTokens: 128000, inputCostPer1k: 0.002, outputCostPer1k: 0.006 },
      { id: "mistral-medium", name: "Mistral Medium", maxTokens: 32000, inputCostPer1k: 0.0027, outputCostPer1k: 0.0081 },
      { id: "codestral", name: "Codestral", maxTokens: 32000, inputCostPer1k: 0.001, outputCostPer1k: 0.003 },
    ],
    priority: 4,
  },
  {
    providerKey: "xai",
    displayName: "xAI (Grok)",
    displayNameAr: "إكس إيه آي (جروك)",
    logo: "https://x.ai/favicon.ico",
    website: "https://x.ai",
    apiKeyUrl: "https://console.x.ai/api-keys",
    models: [
      { id: "grok-3", name: "Grok 3", maxTokens: 131072, inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
      { id: "grok-3-mini", name: "Grok 3 Mini", maxTokens: 131072, inputCostPer1k: 0.0003, outputCostPer1k: 0.0005 },
    ],
    priority: 5,
  },
  {
    providerKey: "deepseek",
    displayName: "DeepSeek",
    displayNameAr: "ديب سيك",
    logo: "https://www.deepseek.com/favicon.ico",
    website: "https://deepseek.com",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    models: [
      { id: "deepseek-v3", name: "DeepSeek V3", maxTokens: 128000, inputCostPer1k: 0.00027, outputCostPer1k: 0.0011 },
      { id: "deepseek-r1", name: "DeepSeek R1", maxTokens: 128000, inputCostPer1k: 0.00055, outputCostPer1k: 0.0022 },
    ],
    priority: 6,
  },
  {
    providerKey: "cohere",
    displayName: "Cohere",
    displayNameAr: "كوهير",
    logo: "https://cohere.com/favicon.ico",
    website: "https://cohere.com",
    apiKeyUrl: "https://dashboard.cohere.com/api-keys",
    models: [
      { id: "command-r-plus", name: "Command R+", maxTokens: 128000, inputCostPer1k: 0.0025, outputCostPer1k: 0.01 },
      { id: "command-r", name: "Command R", maxTokens: 128000, inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 },
    ],
    priority: 7,
  },
  {
    providerKey: "meta",
    displayName: "Meta (Llama)",
    displayNameAr: "ميتا (لاما)",
    logo: "https://about.meta.com/favicon.ico",
    website: "https://llama.meta.com",
    apiKeyUrl: "https://llama.meta.com/docs/getting_started",
    models: [
      { id: "llama-4-maverick", name: "Llama 4 Maverick", maxTokens: 1000000, inputCostPer1k: 0.0002, outputCostPer1k: 0.0008 },
      { id: "llama-4-scout", name: "Llama 4 Scout", maxTokens: 512000, inputCostPer1k: 0.00015, outputCostPer1k: 0.0004 },
      { id: "llama-3.3-70b", name: "Llama 3.3 70B", maxTokens: 128000, inputCostPer1k: 0.00018, outputCostPer1k: 0.00036 },
    ],
    priority: 8,
  },
  {
    providerKey: "perplexity",
    displayName: "Perplexity",
    displayNameAr: "بربلكسيتي",
    logo: "https://www.perplexity.ai/favicon.ico",
    website: "https://perplexity.ai",
    apiKeyUrl: "https://www.perplexity.ai/settings/api",
    models: [
      { id: "sonar-pro", name: "Sonar Pro", maxTokens: 200000, inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
      { id: "sonar", name: "Sonar", maxTokens: 128000, inputCostPer1k: 0.001, outputCostPer1k: 0.001 },
    ],
    priority: 9,
  },
  {
    providerKey: "groq",
    displayName: "Groq",
    displayNameAr: "جروك",
    logo: "https://groq.com/favicon.ico",
    website: "https://groq.com",
    apiKeyUrl: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-groq", name: "Llama 3.3 70B", maxTokens: 128000, inputCostPer1k: 0.00059, outputCostPer1k: 0.00079 },
      { id: "mixtral-8x7b-groq", name: "Mixtral 8x7B", maxTokens: 32768, inputCostPer1k: 0.00024, outputCostPer1k: 0.00024 },
    ],
    priority: 10,
  },
  {
    providerKey: "together",
    displayName: "Together AI",
    displayNameAr: "توجيذر إيه آي",
    logo: "https://www.together.ai/favicon.ico",
    website: "https://together.ai",
    apiKeyUrl: "https://api.together.ai/settings/api-keys",
    models: [
      { id: "qwen-2.5-72b", name: "Qwen 2.5 72B", maxTokens: 32768, inputCostPer1k: 0.0009, outputCostPer1k: 0.0009 },
      { id: "deepseek-v3-together", name: "DeepSeek V3", maxTokens: 128000, inputCostPer1k: 0.0008, outputCostPer1k: 0.0008 },
    ],
    priority: 11,
  },
  {
    providerKey: "fireworks",
    displayName: "Fireworks AI",
    displayNameAr: "فايروركس",
    logo: "https://fireworks.ai/favicon.ico",
    website: "https://fireworks.ai",
    apiKeyUrl: "https://fireworks.ai/account/api-keys",
    models: [
      { id: "llama-3.3-70b-fw", name: "Llama 3.3 70B", maxTokens: 128000, inputCostPer1k: 0.0002, outputCostPer1k: 0.0002 },
      { id: "qwen-2.5-72b-fw", name: "Qwen 2.5 72B", maxTokens: 32768, inputCostPer1k: 0.0009, outputCostPer1k: 0.0009 },
    ],
    priority: 12,
  },
  {
    providerKey: "ai21",
    displayName: "AI21 Labs",
    displayNameAr: "إيه آي 21 لابز",
    logo: "https://www.ai21.com/favicon.ico",
    website: "https://ai21.com",
    apiKeyUrl: "https://studio.ai21.com/account/api-key",
    models: [
      { id: "jamba-1.5-large", name: "Jamba 1.5 Large", maxTokens: 256000, inputCostPer1k: 0.002, outputCostPer1k: 0.008 },
      { id: "jamba-1.5-mini", name: "Jamba 1.5 Mini", maxTokens: 256000, inputCostPer1k: 0.0002, outputCostPer1k: 0.0004 },
    ],
    priority: 13,
  },
  {
    providerKey: "replicate",
    displayName: "Replicate",
    displayNameAr: "ريبليكيت",
    logo: "https://replicate.com/favicon.ico",
    website: "https://replicate.com",
    apiKeyUrl: "https://replicate.com/account/api-tokens",
    models: [
      { id: "llama-3-70b-replicate", name: "Llama 3 70B", maxTokens: 8192, inputCostPer1k: 0.00065, outputCostPer1k: 0.00275 },
    ],
    priority: 14,
  },
  {
    providerKey: "huggingface",
    displayName: "Hugging Face",
    displayNameAr: "هقنق فيس",
    logo: "https://huggingface.co/favicon.ico",
    website: "https://huggingface.co",
    apiKeyUrl: "https://huggingface.co/settings/tokens",
    models: [
      { id: "qwen-2.5-72b-hf", name: "Qwen 2.5 72B", maxTokens: 32768, inputCostPer1k: 0.0009, outputCostPer1k: 0.0009 },
    ],
    priority: 15,
  },
  {
    providerKey: "azure",
    displayName: "Azure OpenAI",
    displayNameAr: "أزور أوبن إيه آي",
    logo: "https://azure.microsoft.com/favicon.ico",
    website: "https://azure.microsoft.com/en-us/products/ai-services/openai-service",
    apiKeyUrl: "https://portal.azure.com/#blade/Microsoft_Azure_ProjectOxford/CognitiveServicesHub",
    models: [
      { id: "gpt-4o-azure", name: "GPT-4o (Azure)", maxTokens: 128000, inputCostPer1k: 0.005, outputCostPer1k: 0.015 },
      { id: "gpt-4o-mini-azure", name: "GPT-4o Mini (Azure)", maxTokens: 128000, inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 },
    ],
    priority: 16,
  },
  {
    providerKey: "nvidia",
    displayName: "NVIDIA NIM",
    displayNameAr: "إنفيديا نيم",
    logo: "https://www.nvidia.com/favicon.ico",
    website: "https://build.nvidia.com",
    apiKeyUrl: "https://build.nvidia.com/explore/discover",
    models: [
      { id: "llama-3.1-405b-nim", name: "Llama 3.1 405B", maxTokens: 128000, inputCostPer1k: 0.009, outputCostPer1k: 0.009 },
    ],
    priority: 17,
  },
  {
    providerKey: "alibaba",
    displayName: "Alibaba (Qwen)",
    displayNameAr: "علي بابا (كوين)",
    logo: "https://www.alibabacloud.com/favicon.ico",
    website: "https://www.alibabacloud.com/product/model-studio",
    apiKeyUrl: "https://dashscope.console.aliyun.com/apiKey",
    models: [
      { id: "qwen-max", name: "Qwen Max", maxTokens: 32768, inputCostPer1k: 0.0016, outputCostPer1k: 0.007 },
      { id: "qwen-plus", name: "Qwen Plus", maxTokens: 131072, inputCostPer1k: 0.0004, outputCostPer1k: 0.0012 },
      { id: "qwen-turbo", name: "Qwen Turbo", maxTokens: 1000000, inputCostPer1k: 0.00005, outputCostPer1k: 0.0002 },
    ],
    priority: 18,
  },
  {
    providerKey: "stability",
    displayName: "Stability AI",
    displayNameAr: "ستابيليتي إيه آي",
    logo: "https://stability.ai/favicon.ico",
    website: "https://stability.ai",
    apiKeyUrl: "https://platform.stability.ai/account/keys",
    models: [
      { id: "stable-lm-2", name: "Stable LM 2", maxTokens: 4096, inputCostPer1k: 0.001, outputCostPer1k: 0.001 },
    ],
    priority: 19,
  },
  {
    providerKey: "amazon",
    displayName: "Amazon Bedrock",
    displayNameAr: "أمازون بيدروك",
    logo: "https://aws.amazon.com/favicon.ico",
    website: "https://aws.amazon.com/bedrock",
    apiKeyUrl: "https://console.aws.amazon.com/bedrock",
    models: [
      { id: "claude-sonnet-bedrock", name: "Claude Sonnet (Bedrock)", maxTokens: 200000, inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
      { id: "titan-text-bedrock", name: "Amazon Titan Text", maxTokens: 8192, inputCostPer1k: 0.0003, outputCostPer1k: 0.0004 },
    ],
    priority: 20,
  },
];

async function seedProviders() {
  const existing = await db.select().from(aiProvidersTable);
  if (existing.length > 0) return existing;

  const inserted = [];
  for (const p of DEFAULT_PROVIDERS) {
    const [row] = await db.insert(aiProvidersTable).values(p).returning();
    inserted.push(row);
  }
  return inserted;
}

function maskApiKey(key: string | null): string {
  if (!key || key.length < 8) return key ? "••••" : "";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

function maskProvider(p: any) {
  return { ...p, apiKey: maskApiKey(p.apiKey) };
}

router.get("/providers", async (_req, res) => {
  try {
    let providers = await db.select().from(aiProvidersTable).orderBy(aiProvidersTable.priority);
    if (providers.length === 0) {
      providers = await seedProviders();
    }
    res.json(providers.map(maskProvider));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/providers/:key", async (req, res) => {
  try {
    const [provider] = await db.select().from(aiProvidersTable).where(eq(aiProvidersTable.providerKey, req.params.key));
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    res.json(maskProvider(provider));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/providers/:key", async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedAt = new Date();
    const [updated] = await db.update(aiProvidersTable)
      .set(updates)
      .where(eq(aiProvidersTable.providerKey, req.params.key))
      .returning();
    if (!updated) return res.status(404).json({ error: "Provider not found" });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/providers", async (req, res) => {
  try {
    const body = req.body;
    const [existing] = await db.select().from(aiProvidersTable).where(eq(aiProvidersTable.providerKey, body.providerKey));
    if (existing) return res.status(409).json({ error: "Provider key already exists" });

    const [created] = await db.insert(aiProvidersTable).values({
      ...body,
      isCustom: true,
    }).returning();
    res.json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/providers/:key", async (req, res) => {
  try {
    const [provider] = await db.select().from(aiProvidersTable).where(eq(aiProvidersTable.providerKey, req.params.key));
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    if (!provider.isCustom) return res.status(403).json({ error: "Cannot delete built-in providers" });

    await db.delete(aiProvidersTable).where(eq(aiProvidersTable.providerKey, req.params.key));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/providers/:key/usage", async (req, res) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allLogs = await db.select().from(providerUsageLogsTable)
      .where(eq(providerUsageLogsTable.providerKey, req.params.key))
      .orderBy(desc(providerUsageLogsTable.createdAt))
      .limit(200);

    const dailyLogs = allLogs.filter(l => l.createdAt >= dayAgo);
    const weeklyLogs = allLogs.filter(l => l.createdAt >= weekAgo);
    const monthlyLogs = allLogs.filter(l => l.createdAt >= monthAgo);

    const sumCost = (logs: typeof allLogs) => logs.reduce((s, l) => s + parseFloat(l.costUsd), 0);
    const sumTokens = (logs: typeof allLogs) => logs.reduce((s, l) => s + l.inputTokens + l.outputTokens, 0);

    res.json({
      daily: { cost: sumCost(dailyLogs), tokens: sumTokens(dailyLogs), requests: dailyLogs.length },
      weekly: { cost: sumCost(weeklyLogs), tokens: sumTokens(weeklyLogs), requests: weeklyLogs.length },
      monthly: { cost: sumCost(monthlyLogs), tokens: sumTokens(monthlyLogs), requests: monthlyLogs.length },
      recentLogs: allLogs.slice(0, 50),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/providers/:key/agents", async (req, res) => {
  try {
    const allAgents = await db.select().from(agentConfigsTable);
    const providerKey = req.params.key;

    const linkedAgents = allAgents.filter(a => {
      const pm = a.primaryModel as any;
      const sm = a.secondaryModel as any;
      const tm = a.tertiaryModel as any;
      return (pm?.provider === providerKey) || (sm?.provider === providerKey) || (tm?.provider === providerKey);
    }).map(a => ({
      agentKey: a.agentKey,
      displayNameEn: a.displayNameEn,
      displayNameAr: a.displayNameAr,
      slots: [
        (a.primaryModel as any)?.provider === providerKey ? { slot: "primary", model: (a.primaryModel as any)?.model } : null,
        (a.secondaryModel as any)?.provider === providerKey ? { slot: "secondary", model: (a.secondaryModel as any)?.model } : null,
        (a.tertiaryModel as any)?.provider === providerKey ? { slot: "tertiary", model: (a.tertiaryModel as any)?.model } : null,
      ].filter(Boolean),
    }));

    res.json(linkedAgents);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/providers/:key/swap-model", async (req, res) => {
  try {
    const { oldModelId, newModelId } = req.body;
    const providerKey = req.params.key;
    const allAgents = await db.select().from(agentConfigsTable);

    let updated = 0;
    for (const agent of allAgents) {
      let changed = false;
      const pm = agent.primaryModel as any;
      const sm = agent.secondaryModel as any;
      const tm = agent.tertiaryModel as any;

      if (pm?.provider === providerKey && pm?.model === oldModelId) {
        pm.model = newModelId;
        changed = true;
      }
      if (sm?.provider === providerKey && sm?.model === oldModelId) {
        sm.model = newModelId;
        changed = true;
      }
      if (tm?.provider === providerKey && tm?.model === oldModelId) {
        tm.model = newModelId;
        changed = true;
      }

      if (changed) {
        await db.update(agentConfigsTable).set({
          primaryModel: pm,
          secondaryModel: sm,
          tertiaryModel: tm,
          updatedAt: new Date(),
        }).where(eq(agentConfigsTable.agentKey, agent.agentKey));
        updated++;
      }
    }

    res.json({ success: true, agentsUpdated: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/providers/:key/validate-key", async (req, res) => {
  try {
    const [provider] = await db.select().from(aiProvidersTable).where(eq(aiProvidersTable.providerKey, req.params.key));
    if (!provider) return res.status(404).json({ error: "Provider not found" });

    if (!provider.apiKey) {
      await db.update(aiProvidersTable).set({ keyStatus: "inactive", updatedAt: new Date() }).where(eq(aiProvidersTable.providerKey, req.params.key));
      return res.json({ status: "inactive", message: "No API key set" });
    }

    let status = "active";
    try {
      if (provider.providerKey === "openai" || provider.providerKey === "azure") {
        const resp = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
        });
        if (!resp.ok) status = "error";
      } else if (provider.providerKey === "anthropic") {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": provider.apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: "claude-haiku-3-5", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
        });
        if (resp.status === 401) status = "error";
      } else {
        status = "active";
      }
    } catch {
      status = "error";
    }

    await db.update(aiProvidersTable).set({ keyStatus: status, updatedAt: new Date() }).where(eq(aiProvidersTable.providerKey, req.params.key));
    res.json({ status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
