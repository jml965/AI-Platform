import { pgTable, uuid, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const projectsTable = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  teamId: uuid("team_id"),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  prompt: text("prompt"),
  totalTokensUsed: integer("total_tokens_used").default(0),
  totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 6 }).default("0.000000"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
