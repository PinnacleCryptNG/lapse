import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { requireOwner } from "../server/lib/owner.js";
import { saveImport } from "../server/lib/store.js";

export default defineAction({
  description:
    "Store pasted bank-statement text, a CSV export, or billing emails and parse them deterministically (no LLM) into charge candidates. Call detect-recurring with the returned importId next to fill the table.",
  schema: z.object({
    text: z.string().min(1).max(200_000).describe("Raw pasted statement lines, CSV file contents, or email text"),
    kind: z.enum(["statement", "csv", "email"]).describe("Which parser to use"),
  }),
  http: { method: "POST" },
  run: async ({ text, kind }, ctx) => {
    const owner = requireOwner(ctx);
    const { importId, charges, emails, skipped, rowCount } = await saveImport(owner, kind, text);
    return {
      importId,
      kind,
      rowCount,
      charges: charges.slice(0, 200),
      emails: emails.map(({ raw: _raw, ...e }) => e),
      skippedLines: skipped.slice(0, 50),
      next: "Call detect-recurring with this importId to create or update subscription rows.",
    };
  },
});
