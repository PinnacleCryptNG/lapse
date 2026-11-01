import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "../server/db/index.js";
import { STATUSES, subscriptions } from "../server/db/schema.js";
import { requireOwner } from "../server/lib/owner.js";
import { actorFromCaller, getSubscription, nowIso, savingsSummary } from "../server/lib/store.js";

export default defineAction({
  description:
    "Stamp a subscription's status (keep, cancel, unsure, cancelled, …) and return the updated savings summary. The UI stamps count as the user; agent calls cannot override a user decision.",
  schema: z.object({
    id: z.string().describe("Subscription id"),
    status: z.enum(STATUSES).describe("New status"),
  }),
  http: { method: "POST" },
  run: async ({ id, status }, ctx) => {
    const owner = requireOwner(ctx);
    const actor = actorFromCaller(ctx?.caller);
    const row = await getSubscription(owner, id);
    if (actor === "agent" && row.decidedBy === "user" && row.status !== status) {
      fail(`The user already decided ${row.merchant} ("${row.status}"). Suggest the change instead.`, {
        errorCode: "user_decided",
        statusCode: 409,
      });
    }
    await getDb()
      .update(subscriptions)
      .set({ status, decidedBy: status === "detected" ? ("agent" as const) : actor, updatedAt: nowIso() })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerEmail, owner)));
    return { id, status, decidedBy: status === "detected" ? ("agent" as const) : actor, savings: await savingsSummary(owner) };
  },
});
