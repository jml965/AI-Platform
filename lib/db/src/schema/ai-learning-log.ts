import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const aiLearningLogTable = pgTable("ai_learning_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentKey: text("agent_key").notNull(),
  action: text("action").notNull(),
  tool: text("tool").notNull(),
  input: jsonb("input"),
  result: text("result"),
  success: integer("success").default(1),
  pattern: text("pattern"),
  learnedRule: text("learned_rule"),
  projectContext: text("project_context"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
