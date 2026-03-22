import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const uiEditHistoryTable = pgTable("ui_edit_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  tableName: text("table_name").notNull(),
  recordKey: text("record_key").notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value").notNull(),
  lang: text("lang").default("ar"),
  editedBy: text("edited_by").default("ai_engine"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
