import { pgTable, uuid, text, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const qaReportsTable = pgTable("qa_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  buildId: uuid("build_id").notNull(),
  status: text("status").notNull().default("pending"),
  overallScore: integer("overall_score"),
  lintStatus: text("lint_status").notNull().default("pending"),
  lintScore: integer("lint_score"),
  lintDetails: jsonb("lint_details"),
  runtimeStatus: text("runtime_status").notNull().default("pending"),
  runtimeScore: integer("runtime_score"),
  runtimeDetails: jsonb("runtime_details"),
  functionalStatus: text("functional_status").notNull().default("pending"),
  functionalScore: integer("functional_score"),
  functionalDetails: jsonb("functional_details"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  fixAttempts: jsonb("fix_attempts"),
  totalDurationMs: integer("total_duration_ms"),
  totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 6 }).default("0.000000"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type QaReport = typeof qaReportsTable.$inferSelect;
