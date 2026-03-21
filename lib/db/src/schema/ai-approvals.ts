import { pgTable, uuid, text, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";

export const aiApprovalsTable = pgTable("ai_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentKey: text("agent_key").notNull(),
  userId: text("user_id"),
  tool: text("tool").notNull(),
  input: jsonb("input"),
  explanation: text("explanation"),
  risk: text("risk").notNull().default("medium"),
  category: text("category"),
  impact: text("impact"),
  reversible: boolean("reversible").default(true),
  status: text("status").notNull().default("pending"),
  decidedBy: text("decided_by"),
  decidedAt: timestamp("decided_at"),
  executionResult: jsonb("execution_result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_approvals_status").on(table.status),
  index("idx_approvals_agent_created").on(table.agentKey, table.createdAt),
]);

export type AiApproval = typeof aiApprovalsTable.$inferSelect;
