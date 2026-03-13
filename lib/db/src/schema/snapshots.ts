import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const snapshotsTable = pgTable("snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  description: text("description"),
  filesData: jsonb("files_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSnapshotSchema = createInsertSchema(snapshotsTable).omit({ id: true, createdAt: true });
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Snapshot = typeof snapshotsTable.$inferSelect;
