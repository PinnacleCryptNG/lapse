import { runMigrations } from "@agent-native/core/db";

export default runMigrations(
  [
    {
      version: 1,
      name: "lapse-subscriptions",
      sql: `CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        merchant TEXT NOT NULL,
        raw_descriptor TEXT NOT NULL DEFAULT '',
        amount_minor INTEGER NOT NULL,
        currency TEXT NOT NULL,
        cadence TEXT NOT NULL DEFAULT 'unknown',
        kind TEXT NOT NULL DEFAULT 'subscription',
        last_charge_date TEXT,
        next_charge_date TEXT,
        trial_ends TEXT,
        category TEXT NOT NULL DEFAULT 'other',
        status TEXT NOT NULL DEFAULT 'detected',
        confidence INTEGER NOT NULL DEFAULT 50,
        decided_by TEXT NOT NULL DEFAULT 'agent',
        note TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'manual',
        updated_at TEXT NOT NULL DEFAULT now()
      )`,
    },
    {
      version: 2,
      name: "lapse-subscriptions-owner-next-idx",
      sql: `CREATE INDEX IF NOT EXISTS subscriptions_owner_next_idx ON subscriptions (owner_email, next_charge_date)`,
    },
    {
      version: 3,
      name: "lapse-cancel-kits",
      sql: `CREATE TABLE IF NOT EXISTS cancel_kits (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        owner_email TEXT NOT NULL,
        channel TEXT NOT NULL,
        steps_md TEXT NOT NULL,
        message_subject TEXT,
        message_body TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'English',
        created_at TEXT NOT NULL DEFAULT now()
      )`,
    },
    {
      version: 4,
      name: "lapse-cancel-kits-sub-idx",
      sql: `CREATE INDEX IF NOT EXISTS cancel_kits_owner_sub_idx ON cancel_kits (owner_email, subscription_id)`,
    },
    {
      version: 5,
      name: "lapse-imports",
      sql: `CREATE TABLE IF NOT EXISTS imports (
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        kind TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT now()
      )`,
    },
  ],
  { table: "lapse_migrations" },
);
