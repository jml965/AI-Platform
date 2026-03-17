import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { aiProvidersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

let cachedKeys: { openai: string | null; anthropic: string | null; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 300_000;

let _cachedAnthropicClient: Anthropic | null = null;
let _cachedOpenAIClient: OpenAI | null = null;
let _clientCacheTime = 0;

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
  const now = Date.now();
  if (_cachedOpenAIClient && (now - _clientCacheTime) < CACHE_TTL_MS) return _cachedOpenAIClient;

  const dbKey = await fetchActiveKey("openai");
  if (dbKey) {
    _cachedOpenAIClient = new OpenAI({ apiKey: dbKey });
    _clientCacheTime = now;
    return _cachedOpenAIClient;
  }

  const envKey = getEnvOpenAIKey();
  if (envKey) {
    const baseURL = !process.env.CUSTOM_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      ? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      : undefined;
    _cachedOpenAIClient = new OpenAI({ apiKey: envKey, ...(baseURL ? { baseURL } : {}) });
    _clientCacheTime = now;
    return _cachedOpenAIClient;
  }

  throw new Error("No OpenAI API key available. Add one in Control Center or set CUSTOM_OPENAI_API_KEY.");
}

export async function getAnthropicClient(): Promise<Anthropic> {
  const now = Date.now();
  if (_cachedAnthropicClient && (now - _clientCacheTime) < CACHE_TTL_MS) return _cachedAnthropicClient;

  const dbKey = await fetchActiveKey("anthropic");
  if (dbKey) {
    _cachedAnthropicClient = new Anthropic({ apiKey: dbKey });
    _clientCacheTime = now;
    return _cachedAnthropicClient;
  }

  const envKey = getEnvAnthropicKey();
  if (envKey) {
    const baseURL = !process.env.CUSTOM_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
      ? process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
      : undefined;
    _cachedAnthropicClient = new Anthropic({ apiKey: envKey, ...(baseURL ? { baseURL } : {}) });
    _clientCacheTime = now;
    return _cachedAnthropicClient;
  }

  throw new Error("No Anthropic API key available. Add one in Control Center or set CUSTOM_ANTHROPIC_API_KEY.");
}

export function clearKeyCache() {
  cachedKeys = null;
  _cachedAnthropicClient = null;
  _cachedOpenAIClient = null;
  _clientCacheTime = 0;
}
