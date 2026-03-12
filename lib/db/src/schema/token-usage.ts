import { pgTable, uuid, text, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const tokenUsageTable = pgTable("token_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  buildId: uuid("build_id"),
  agentType: text("agent_type").notNull(),
  model: text("model").notNull(),
  tokensInput: integer("tokens_input").notNull().default(0),
  tokensOutput: integer("tokens_output").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0.000000"),
  usageDate: date("usage_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTokenUsageSchema = createInsertSchema(tokenUsageTable).omit({ id: true, createdAt: true });
export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>;
export type TokenUsage = typeof tokenUsageTable.$inferSelect;
