import { Router } from "express";
import { db } from "@workspace/db";
import { mediaProvidersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_IMAGE_PROVIDERS = [
  {
    providerKey: "openai_dalle",
    type: "image",
    displayName: "DALL·E (OpenAI)",
    displayNameAr: "دال-إي (أوبن إيه آي)",
    website: "https://openai.com",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "dall-e-3", name: "DALL·E 3", maxResolution: "1024x1024", costPerRequest: 0.04, description: "أحدث نموذج لتوليد الصور عالية الجودة" },
      { id: "dall-e-2", name: "DALL·E 2", maxResolution: "1024x1024", costPerRequest: 0.02, description: "نموذج سريع وأقل تكلفة" },
    ],
    priority: 1,
  },
  {
    providerKey: "stability_ai",
    type: "image",
    displayName: "Stability AI",
    displayNameAr: "ستابيليتي إيه آي",
    website: "https://stability.ai",
    apiKeyUrl: "https://platform.stability.ai/account/keys",
    models: [
      { id: "stable-diffusion-xl", name: "Stable Diffusion XL", maxResolution: "1024x1024", costPerRequest: 0.002, description: "نموذج مفتوح المصدر لتوليد صور عالية الدقة" },
      { id: "sd3-medium", name: "SD3 Medium", maxResolution: "1024x1024", costPerRequest: 0.003, description: "الجيل الثالث من Stable Diffusion" },
    ],
    priority: 2,
  },
  {
    providerKey: "midjourney_api",
    type: "image",
    displayName: "Midjourney",
    displayNameAr: "ميدجورني",
    website: "https://midjourney.com",
    apiKeyUrl: "https://midjourney.com",
    models: [
      { id: "midjourney-v6", name: "Midjourney v6", maxResolution: "2048x2048", costPerRequest: 0.05, description: "أفضل نموذج للصور الفنية والإبداعية" },
    ],
    priority: 3,
  },
  {
    providerKey: "google_imagen",
    type: "image",
    displayName: "Google Imagen",
    displayNameAr: "جوجل إيماجن",
    website: "https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview",
    apiKeyUrl: "https://console.cloud.google.com/apis/credentials",
    models: [
      { id: "imagen-3", name: "Imagen 3", maxResolution: "1024x1024", costPerRequest: 0.03, description: "نموذج جوجل لتوليد الصور بجودة فائقة" },
    ],
    priority: 4,
  },
];

const DEFAULT_VIDEO_PROVIDERS = [
  {
    providerKey: "runway_ml",
    type: "video",
    displayName: "Runway ML",
    displayNameAr: "رانواي إم إل",
    website: "https://runwayml.com",
    apiKeyUrl: "https://app.runwayml.com/settings/api-keys",
    models: [
      { id: "gen-3-alpha", name: "Gen-3 Alpha", maxResolution: "1280x768", costPerRequest: 0.50, description: "أحدث نموذج لتوليد فيديو عالي الجودة" },
      { id: "gen-2", name: "Gen-2", maxResolution: "768x512", costPerRequest: 0.25, description: "نموذج سريع لتوليد الفيديو" },
    ],
    priority: 1,
  },
  {
    providerKey: "pika_labs",
    type: "video",
    displayName: "Pika Labs",
    displayNameAr: "بيكا لابز",
    website: "https://pika.art",
    apiKeyUrl: "https://pika.art",
    models: [
      { id: "pika-1.0", name: "Pika 1.0", maxResolution: "1024x576", costPerRequest: 0.30, description: "نموذج متقدم لتحويل النص والصور إلى فيديو" },
    ],
    priority: 2,
  },
  {
    providerKey: "openai_sora",
    type: "video",
    displayName: "Sora (OpenAI)",
    displayNameAr: "سورا (أوبن إيه آي)",
    website: "https://openai.com/sora",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "sora-1.0", name: "Sora 1.0", maxResolution: "1920x1080", costPerRequest: 1.00, description: "نموذج أوبن إيه آي لتوليد فيديو واقعي" },
    ],
    priority: 3,
  },
  {
    providerKey: "kling_ai",
    type: "video",
    displayName: "Kling AI",
    displayNameAr: "كلينج إيه آي",
    website: "https://kling.ai",
    apiKeyUrl: "https://kling.ai",
    models: [
      { id: "kling-v1", name: "Kling v1", maxResolution: "1280x720", costPerRequest: 0.40, description: "نموذج صيني متقدم لتوليد الفيديو" },
    ],
    priority: 4,
  },
  {
    providerKey: "luma_ai",
    type: "video",
    displayName: "Luma AI (Dream Machine)",
    displayNameAr: "لوما إيه آي",
    website: "https://lumalabs.ai",
    apiKeyUrl: "https://lumalabs.ai",
    models: [
      { id: "dream-machine-1.5", name: "Dream Machine 1.5", maxResolution: "1360x752", costPerRequest: 0.35, description: "نموذج سريع لتوليد فيديو إبداعي" },
    ],
    priority: 5,
  },
];

async function seedMediaProviders() {
  const existing = await db.select().from(mediaProvidersTable);
  if (existing.length > 0) return;
  const allDefaults = [...DEFAULT_IMAGE_PROVIDERS, ...DEFAULT_VIDEO_PROVIDERS];
  for (const p of allDefaults) {
    await db.insert(mediaProvidersTable).values(p as any).onConflictDoNothing();
  }
}

function maskApiKey(key: string | null): string {
  if (!key || key.length < 10) return key || "";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

function maskProvider(p: any) {
  return { ...p, apiKey: maskApiKey(p.apiKey) };
}

router.get("/media-providers", async (_req, res) => {
  try {
    await seedMediaProviders();
    const providers = await db.select().from(mediaProvidersTable).orderBy(mediaProvidersTable.type, mediaProvidersTable.priority);
    res.json(providers.map(maskProvider));
  } catch (e) {
    res.status(500).json({ error: "Failed to load media providers" });
  }
});

router.get("/media-providers/:key", async (req, res) => {
  try {
    const [p] = await db.select().from(mediaProvidersTable).where(eq(mediaProvidersTable.providerKey, req.params.key));
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(maskProvider(p));
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/media-providers/:key", async (req, res) => {
  try {
    const { providerKey, id, createdAt, isCustom, ...data } = req.body;
    const [updated] = await db.update(mediaProvidersTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mediaProvidersTable.providerKey, req.params.key))
      .returning();
    res.json(maskProvider(updated));
  } catch (e) {
    res.status(500).json({ error: "Failed to update" });
  }
});

router.post("/media-providers", async (req, res) => {
  try {
    const [created] = await db.insert(mediaProvidersTable).values({ ...req.body, isCustom: true }).returning();
    res.json(maskProvider(created));
  } catch (e) {
    res.status(500).json({ error: "Failed to create" });
  }
});

router.delete("/media-providers/:key", async (req, res) => {
  try {
    const [p] = await db.select().from(mediaProvidersTable).where(eq(mediaProvidersTable.providerKey, req.params.key));
    if (!p) return res.status(404).json({ error: "Not found" });
    if (!p.isCustom) return res.status(403).json({ error: "Cannot delete built-in provider" });
    await db.delete(mediaProvidersTable).where(eq(mediaProvidersTable.providerKey, req.params.key));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
