import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const rolesTable = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  displayNameAr: text("display_name_ar").notNull(),
  level: text("level").notNull().default("1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Role = typeof rolesTable.$inferSelect;
