import { sql } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const CADENCES = ["weekly", "monthly", "quarterly", "yearly", "unknown"] as const;
export const KINDS = ["subscription", "trial", "one_off"] as const;
export const STATUSES = [
  "detected",
  "keep",
  "cancel",
  "unsure",
  "cancel_drafted",
  "cancelled",
  "snoozed",
] as const;
export const ACTORS = ["user", "agent"] as const;
export const SOURCES = ["statement", "csv", "email", "sample", "manual"] as const;
export const CHANNELS = ["email", "in_app", "phone", "app_store", "play_store"] as const;
export const IMPORT_KINDS = ["statement", "csv", "email", "sample"] as const;

export type Cadence = (typeof CADENCES)[number];
export type Kind = (typeof KINDS)[number];
export type Status = (typeof STATUSES)[number];
export type Actor = (typeof ACTORS)[number];
export type Source = (typeof SOURCES)[number];
export type Channel = (typeof CHANNELS)[number];

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  merchant: text("merchant").notNull(),
  rawDescriptor: text("raw_descriptor").notNull().default(""),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(),
  cadence: text("cadence", { enum: CADENCES }).notNull().default("unknown"),
  kind: text("kind", { enum: KINDS }).notNull().default("subscription"),
  lastChargeDate: text("last_charge_date"),
  nextChargeDate: text("next_charge_date"),
  trialEnds: text("trial_ends"),
  category: text("category").notNull().default("other"),
  status: text("status", { enum: STATUSES }).notNull().default("detected"),
  confidence: integer("confidence").notNull().default(50),
  decidedBy: text("decided_by", { enum: ACTORS }).notNull().default("agent"),
  note: text("note").notNull().default(""),
  source: text("source", { enum: SOURCES }).notNull().default("manual"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const cancelKits = pgTable("cancel_kits", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull(),
  ownerEmail: text("owner_email").notNull(),
  channel: text("channel", { enum: CHANNELS }).notNull(),
  stepsMd: text("steps_md").notNull(),
  messageSubject: text("message_subject"),
  messageBody: text("message_body").notNull(),
  language: text("language").notNull().default("English"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const imports = pgTable("imports", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  kind: text("kind", { enum: IMPORT_KINDS }).notNull(),
  rawText: text("raw_text").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type CancelKitRow = typeof cancelKits.$inferSelect;
export type ImportRow = typeof imports.$inferSelect;
