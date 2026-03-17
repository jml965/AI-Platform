import { pgTable, uuid, text, timestamp, integer, numeric, boolean, jsonb } from "drizzle-orm/pg-core";

export const aiProvidersTable = pgTable("ai_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerKey: text("provider_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  displayNameAr: text("display_name_ar").notNull(),
  logo: text("logo").default(""),
  website: text("website").default(""),
  apiKeyUrl: text("api_key_url").default(""),
  apiKey: text("api_key").default(""),
  keyStatus: text("key_status").notNull().default("inactive"),
  isCustom: boolean("is_custom").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(10),

  models: jsonb("models").$type<{
    id: string;
    name: string;
    maxTokens: number;
    inputCostPer1k: number;
    outputCostPer1k: number;
  }[]>().default([]),

  fallbackProviderKey: text("fallback_provider_key"),

  budgetMonthlyUsd: numeric("budget_monthly_usd", { precision: 10, scale: 2 }).default("0.00"),
  alertThreshold: integer("alert_threshold").notNull().default(80),

  totalTokensUsed: integer("total_tokens_used").notNull().default(0),
  totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 6 }).notNull().default("0.000000"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const providerUsageLogsTable = pgTable("provider_usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerKey: text("provider_key").notNull(),
  modelId: text("model_id").notNull(),
  agentKey: text("agent_key"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0.000000"),
  durationMs: integer("duration_ms").default(0),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiProvider = typeof aiProvidersTable.$inferSelect;
export type ProviderUsageLog = typeof providerUsageLogsTable.$inferSelect;
