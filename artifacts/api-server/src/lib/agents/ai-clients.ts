import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { aiProvidersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

let cachedKeys: { openai: string | null; anthropic: string | null; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchActiveKey(providerKey: string): Promise<string | null> {
  try {
    const now = Date.now();
    if (cachedKeys && (now - cachedKeys.fetchedAt) < CACHE_TTL_MS) {
      return (cachedKeys as any)[providerKey] ?? null;
    }

    const rows = await db
      .select({
        providerKey: aiProvidersTable.providerKey,
        apiKey: aiProvidersTable.apiKey,
        keyStatus: aiProvidersTable.keyStatus,
        enabled: aiProvidersTable.enabled,
      })
      .from(aiProvidersTable)
      .where(eq(aiProvidersTable.enabled, true));

    const newCache: any = { fetchedAt: now, openai: null, anthropic: null };
    for (const row of rows) {
      if (row.apiKey && row.apiKey.trim().length > 5 && row.keyStatus === "active" && row.enabled) {
        newCache[row.providerKey] = row.apiKey;
      }
    }
    cachedKeys = newCache;
    return newCache[providerKey] ?? null;
  } catch {
    return null;
  }
}

function getEnvOpenAIKey(): string | null {
  return process.env.CUSTOM_OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || null;
}

function getEnvAnthropicKey(): string | null {
  return process.env.CUSTOM_ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || null;
}

export async function getOpenAIClient(): Promise<OpenAI> {
  const dbKey = await fetchActiveKey("openai");
  if (dbKey) {
    return new OpenAI({ apiKey: dbKey });
  }

  const envKey = getEnvOpenAIKey();
  if (envKey) {
    const baseURL = !process.env.CUSTOM_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      ? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      : undefined;
    return new OpenAI({ apiKey: envKey, ...(baseURL ? { baseURL } : {}) });
  }

  throw new Error("No OpenAI API key available. Add one in Control Center or set CUSTOM_OPENAI_API_KEY.");
}

export async function getAnthropicClient(): Promise<Anthropic> {
  const dbKey = await fetchActiveKey("anthropic");
  if (dbKey) {
    return new Anthropic({ apiKey: dbKey });
  }

  const envKey = getEnvAnthropicKey();
  if (envKey) {
    const baseURL = !process.env.CUSTOM_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
      ? process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
      : undefined;
    return new Anthropic({ apiKey: envKey, ...(baseURL ? { baseURL } : {}) });
  }

  throw new Error("No Anthropic API key available. Add one in Control Center or set CUSTOM_ANTHROPIC_API_KEY.");
}

export function clearKeyCache() {
  cachedKeys = null;
}
