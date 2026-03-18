import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const strategicThreadsTable = pgTable("strategic_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull().default("New Thread"),
  projectId: varchar("project_id"),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const strategicMessagesTable = pgTable("strategic_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => strategicThreadsTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  thinking: text("thinking"),
  tokensUsed: varchar("tokens_used"),
  cost: varchar("cost"),
  model: varchar("model"),
  attachments: text("attachments"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
