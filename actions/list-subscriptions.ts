import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { STATUSES } from "../server/db/schema.js";
import { requireOwner } from "../server/lib/owner.js";
import { listSubscriptions } from "../server/lib/store.js";

export default defineAction({
  description:
    "List the user's subscriptions and trials, sorted by next charge date (soonest first). Amounts are integer minor units (e.g. 1199 = 11.99).",
  schema: z.object({
    status: z.enum(STATUSES).optional().describe("Only rows with this status"),
    withinDays: z.coerce.number().int().min(0).max(400).optional().describe("Only rows charging within this many days from today"),
    currency: z.string().length(3).optional().describe("Only rows in this ISO currency, e.g. NGN"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async (args, ctx) => {
    const rows = await listSubscriptions(requireOwner(ctx), args);
    return { count: rows.length, rows };
  },
});
