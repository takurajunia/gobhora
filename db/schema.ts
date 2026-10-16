import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const leagues = pgTable("leagues", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
