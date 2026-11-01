import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { requireOwner } from "../server/lib/owner.js";
import { savingsSummary } from "../server/lib/store.js";

export default defineAction({
  description:
    "Yearly savings from cancelled subscriptions, per currency: amount × 52 (weekly), 12 (monthly), 4 (quarterly) or 1 (yearly). Minor units.",
  schema: z.object({}),
  http: { method: "GET" },
  readOnly: true,
  run: async (_args, ctx) => savingsSummary(requireOwner(ctx)),
});
