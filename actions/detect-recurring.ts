import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { requireOwner } from "../server/lib/owner.js";
import { detectFromImport } from "../server/lib/store.js";

export default defineAction({
  description:
    "Find recurring charges in a stored import: normalise merchants, infer cadence from median gaps, compute next charge date and confidence, flag duplicates (same merchant in two currencies) and price rises over 5%, then upsert rows. Never overwrites rows the user decided.",
  schema: z.object({
    importId: z.string().describe("The importId returned by import-statement"),
  }),
  http: { method: "POST" },
  run: async ({ importId }, ctx) => detectFromImport(requireOwner(ctx), importId),
});
