import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const executionLogsTable = pgTable("execution_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  buildId: uuid("build_id").notNull(),
  taskId: uuid("task_id"),
  agentType: text("agent_type").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull(),
  details: jsonb("details"),
  tokensUsed: integer("tokens_used").default(0),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExecutionLogSchema = createInsertSchema(executionLogsTable).omit({ id: true, createdAt: true });
export type InsertExecutionLog = z.infer<typeof insertExecutionLogSchema>;
export type ExecutionLog = typeof executionLogsTable.$inferSelect;
