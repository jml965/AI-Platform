import { pgTable, uuid, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";

export const agentLogsTable = pgTable("agent_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentKey: text("agent_key").notNull(),
  level: text("level").notNull().default("info"),
  action: text("action").notNull(),
  message: text("message").notNull(),
  messageAr: text("message_ar"),
  details: jsonb("details"),
  tokensUsed: integer("tokens_used").default(0),
  durationMs: integer("duration_ms"),
  status: text("status").notNull().default("info"),
  buildId: text("build_id"),
  projectId: text("project_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_agent_logs_key_created").on(table.agentKey, table.createdAt),
]);

export type AgentLog = typeof agentLogsTable.$inferSelect;
