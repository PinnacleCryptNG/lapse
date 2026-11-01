import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { requireOwner } from "../server/lib/owner.js";
import { detectFromImport, importIdFor, saveImport } from "../server/lib/store.js";
import { SAMPLE_LABEL, sampleEmailsText, sampleStatementText } from "../server/sample-data.js";

export default defineAction({
  description: `Load the fictional demo statement and trial emails through the normal parse → detect pipeline (${SAMPLE_LABEL}). Safe to run again: rows are updated, never duplicated, and user decisions are kept.`,
  schema: z.object({}),
  http: { method: "POST" },
  mcpTool: false,
  run: async (_args, ctx) => {
    const owner = requireOwner(ctx);
    const statement = await saveImport(owner, "statement", sampleStatementText(), importIdFor(owner, "sample-statement"));
    const emails = await saveImport(owner, "email", sampleEmailsText(), importIdFor(owner, "sample-emails"));
    const a = await detectFromImport(owner, statement.importId, "sample");
    const b = await detectFromImport(owner, emails.importId, "sample");
    return {
      label: SAMPLE_LABEL,
      chargesParsed: statement.rowCount,
      emailsParsed: emails.rowCount,
      inserted: a.inserted + b.inserted,
      updated: a.updated + b.updated,
      keptUserDecisions: [...a.protectedIds, ...b.protectedIds].length,
      ignoredOneOffs: a.ignored.map((i) => `${i.merchant} (${i.currency})`),
      needsYourInput: [...a.candidates, ...b.candidates]
        .filter((c) => c.status === "unsure" || c.note)
        .map((c) => ({ id: c.id, merchant: c.merchant, currency: c.currency, note: c.note })),
    };
  },
});
