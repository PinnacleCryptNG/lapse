import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { guessImportKind } from "../server/lib/parse.js";
import { requireOwner } from "../server/lib/owner.js";
import { detectFromImport, saveImport } from "../server/lib/store.js";

export default defineAction({
  description:
    "Add charges from anything the user pastes: bank-statement lines, a CSV export, or subscription, receipt and free-trial emails. Detects the format, parses it deterministically (no LLM), finds recurring charges and trials, and adds or updates cards on the shared list. Never overwrites a subscription the user already decided.",
  schema: z.object({
    text: z.string().min(1).max(200_000).describe("Raw pasted statement lines, CSV file contents, or email text"),
    kind: z
      .enum(["auto", "statement", "csv", "email"])
      .default("auto")
      .describe("Format of the text; leave as auto to detect it"),
  }),
  http: { method: "POST" },
  run: async ({ text, kind }, ctx) => {
    const owner = requireOwner(ctx);
    const format = kind === "auto" ? guessImportKind(text) : kind;
    const imp = await saveImport(owner, format, text);
    const det = await detectFromImport(owner, imp.importId);
    return {
      format,
      found: det.inserted + det.updated,
      inserted: det.inserted,
      updated: det.updated,
      keptUserDecisions: det.protectedIds.length,
      skipped: imp.skipped.slice(0, 20),
      ignoredOneOffs: det.ignored.map((i) => `${i.merchant} (${i.currency})`),
      subscriptions: det.candidates,
    };
  },
});
