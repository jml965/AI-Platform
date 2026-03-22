import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const uiTextOverridesTable = pgTable("ui_text_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  lang: text("lang").notNull().default("ar"),
  value: text("value").notNull(),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("ui_text_overrides_key_lang_idx").on(table.key, table.lang),
]);
