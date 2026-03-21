import { pgTable, uuid, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";

export const aiAuditLogsTable = pgTable("ai_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentKey: text("agent_key").notNull(),
  userId: text("user_id"),
  action: text("action").notNull(),
  tool: text("tool"),
  risk: text("risk"),
  input: jsonb("input"),
  result: jsonb("result"),
  status: text("status").notNull().default("success"),
  durationMs: integer("duration_ms"),
  approvalId: uuid("approval_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_agent_created").on(table.agentKey, table.createdAt),
  index("idx_audit_tool").on(table.tool),
]);

export type AiAuditLog = typeof aiAuditLogsTable.$inferSelect;
