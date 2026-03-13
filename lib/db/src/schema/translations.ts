import { pgTable, uuid, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectLanguagesTable = pgTable("project_languages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  languageCode: text("language_code").notNull(),
  languageName: text("language_name").notNull(),
  isDefault: integer("is_default").default(0).notNull(),
  isRtl: integer("is_rtl").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("project_language_unique").on(table.projectId, table.languageCode),
]);

export const translationsTable = pgTable("translations", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  languageCode: text("language_code").notNull(),
  contentKey: text("content_key").notNull(),
  sourceText: text("source_text").notNull(),
  translatedText: text("translated_text").notNull(),
  status: text("status").notNull().default("auto"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("translation_unique").on(table.projectId, table.languageCode, table.contentKey),
]);

export const insertProjectLanguageSchema = createInsertSchema(projectLanguagesTable).omit({ id: true, createdAt: true });
export type InsertProjectLanguage = z.infer<typeof insertProjectLanguageSchema>;
export type ProjectLanguage = typeof projectLanguagesTable.$inferSelect;

export const insertTranslationSchema = createInsertSchema(translationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translationsTable.$inferSelect;
