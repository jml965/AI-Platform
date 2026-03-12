import { pgTable, uuid, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const buildTasksTable = pgTable("build_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  buildId: uuid("build_id").notNull(),
  agentType: text("agent_type").notNull(),
  status: text("status").notNull().default("pending"),
  prompt: text("prompt"),
  targetFile: text("target_file"),
  resultData: text("result_data"),
  tokensUsed: integer("tokens_used").default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).default("0.000000"),
  retryCount: integer("retry_count").default(0),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertBuildTaskSchema = createInsertSchema(buildTasksTable).omit({ id: true, createdAt: true });
export type InsertBuildTask = z.infer<typeof insertBuildTaskSchema>;
export type BuildTask = typeof buildTasksTable.$inferSelect;
