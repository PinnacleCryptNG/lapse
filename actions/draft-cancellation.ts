import { defineAction } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "../server/db/index.js";
import { CHANNELS, cancelKits, subscriptions } from "../server/db/schema.js";
import { requireOwner } from "../server/lib/owner.js";
import { getSubscription, newId, nowIso } from "../server/lib/store.js";

export default defineAction({
  description: "Save a cancellation kit the agent has written. Never sends anything.",
  schema: z.object({
    id: z.string().describe("Subscription id the kit is for"),
    channel: z.enum(CHANNELS).describe("How the user cancels: email, in_app (account/billing page), phone, app_store or play_store"),
    steps_md: z.string().min(1).describe("Markdown numbered steps the user follows themselves; tell them to verify on the service's own site"),
    message_subject: z.string().optional().describe("Subject line for an email/message, if any"),
    message_body: z.string().min(1).describe("Short polite cancellation message in the chosen language, for the user to send themselves"),
    language: z.string().default("English").describe("Language of the kit, e.g. English, French, Portuguese, Spanish, Hausa, Yoruba, Nigerian Pidgin"),
  }),
  http: { method: "POST" },
  run: async (args, ctx) => {
    const owner = requireOwner(ctx);
    const sub = await getSubscription(owner, args.id);
    const kit = {
      id: newId("kit"),
      subscriptionId: sub.id,
      ownerEmail: owner,
      channel: args.channel,
      stepsMd: args.steps_md,
      messageSubject: args.message_subject ?? null,
      messageBody: args.message_body,
      language: args.language,
      createdAt: nowIso(),
    };
    const db = getDb();
    await db.insert(cancelKits).values(kit);
    await db
      .update(subscriptions)
      .set({ status: "cancel_drafted", updatedAt: nowIso() })
      .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.ownerEmail, owner)));
    return {
      kit,
      sent: false,
      reminder: "Nothing was sent. The user must verify the steps on the service's own site and send the message themselves.",
    };
  },
});
