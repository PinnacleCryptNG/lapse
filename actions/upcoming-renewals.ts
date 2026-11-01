import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { requireOwner } from "../server/lib/owner.js";
import { listSubscriptions, totalsByCurrency } from "../server/lib/store.js";

export default defineAction({
  description:
    "What renews or converts from a trial in the next N days, with totals per currency (never converted between currencies). Cancelled rows are excluded.",
  schema: z.object({
    days: z.coerce.number().int().min(1).max(400).default(7).describe("Look-ahead window in days (default 7)"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ days }, ctx) => {
    const rows = (await listSubscriptions(requireOwner(ctx), { withinDays: days })).filter(
      (r) => r.status !== "cancelled",
    );
    return {
      days,
      count: rows.length,
      totals: totalsByCurrency(rows),
      rows: rows.map((r) => ({
        id: r.id,
        merchant: r.merchant,
        amountMinor: r.amountMinor,
        currency: r.currency,
        cadence: r.cadence,
        kind: r.kind,
        nextChargeDate: r.nextChargeDate,
        daysLeft: r.daysLeft,
        status: r.status,
        confidence: r.confidence,
        note: r.note,
      })),
    };
  },
});
