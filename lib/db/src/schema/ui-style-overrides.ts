import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const uiStyleOverridesTable = pgTable("ui_style_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  selector: text("selector").notNull(),
  property: text("property").notNull(),
  value: text("value").notNull(),
  page: text("page").default("*"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("ui_style_overrides_selector_prop_idx").on(table.selector, table.property),
]);
