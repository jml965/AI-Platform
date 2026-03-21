import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const aiSystemSettingsTable = pgTable("ai_system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<any>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
