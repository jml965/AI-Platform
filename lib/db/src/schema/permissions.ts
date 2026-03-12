import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { rolesTable } from "./roles";

export const permissionsTable = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  roleId: uuid("role_id").notNull().references(() => rolesTable.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("permissions_role_permission_unique").on(table.roleId, table.permission),
]);

export type PermissionRecord = typeof permissionsTable.$inferSelect;
