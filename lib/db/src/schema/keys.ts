import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keyStatusEnum = pgEnum("key_status", ["active", "expired", "banned"]);

export const keysTable = pgTable("license_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  game: text("game").notNull(),
  status: keyStatusEnum("status").notNull().default("active"),
  duration: integer("duration").notNull(),
  note: text("note"),
  hwid: text("hwid"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKeySchema = createInsertSchema(keysTable).omit({ id: true, createdAt: true });
export type InsertKey = z.infer<typeof insertKeySchema>;
export type LicenseKey = typeof keysTable.$inferSelect;
