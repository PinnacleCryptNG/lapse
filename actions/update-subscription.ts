import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "../server/db/index.js";
import { CADENCES, KINDS, STATUSES, subscriptions } from "../server/db/schema.js";
import { requireOwner } from "../server/lib/owner.js";
import { getSubscription, nowIso, withDaysLeft } from "../server/lib/store.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export default defineAction({
  description:
    "Edit one subscription row. Bumps updated_at and records who decided when status changes. If actor is agent and the user already decided this row, the change is refused — suggest it in chat instead.",
  schema: z.object({
    id: z.string().describe("Subscription id"),
    actor: z.enum(["user", "agent"]).describe("Who is making the change: 'agent' when Lapse (you) edits, 'user' for the UI"),
    patch: z
      .object({
        merchant: z.string().min(1).optional().describe("Clean merchant name"),
        amountMinor: z.number().int().min(0).optional().describe("Charge amount in minor units (1199 = 11.99). Never guess."),
        currency: z.string().length(3).optional().describe("ISO currency code"),
        cadence: z.enum(CADENCES).optional().describe("Billing cadence"),
        kind: z.enum(KINDS).optional().describe("subscription, trial or one_off"),
        nextChargeDate: isoDate.nullable().optional().describe("Next charge date YYYY-MM-DD"),
        trialEnds: isoDate.nullable().optional().describe("Trial end date YYYY-MM-DD"),
        category: z.string().optional().describe("Category such as streaming, music, software"),
        status: z.enum(STATUSES).optional().describe("Decision status"),
        confidence: z.number().int().min(0).max(100).optional().describe("Detection confidence 0-100"),
        note: z.string().max(500).optional().describe("One-line note or question for the user"),
      })
      .describe("Fields to change"),
  }),
  http: { method: "POST" },
  run: async ({ id, actor, patch }, ctx) => {
    const owner = requireOwner(ctx);
    const row = await getSubscription(owner, id);
    const changesStatus = patch.status !== undefined && patch.status !== row.status;
    if (actor === "agent" && row.decidedBy === "user") {
      const touched = Object.keys(patch).filter((k) => k !== "note");
      if (changesStatus || touched.length) {
        fail(
          `The user already decided ${row.merchant} (status "${row.status}"), so Lapse won't change it. Suggest the change in chat and let the user stamp it.`,
          { errorCode: "user_decided", statusCode: 409, details: { id, status: row.status } },
        );
      }
    }
    const set = Object.fromEntries(
      Object.entries({ ...patch, updatedAt: nowIso() }).filter(([, v]) => v !== undefined),
    ) as Partial<typeof subscriptions.$inferInsert>;
    if (patch.currency) set.currency = patch.currency.toUpperCase();
    if (changesStatus) set.decidedBy = actor;
    const [updated] = await getDb()
      .update(subscriptions)
      .set(set)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerEmail, owner)))
      .returning();
    return { subscription: withDaysLeft(updated!) };
  },
});
