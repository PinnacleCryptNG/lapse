import { defineAction } from "@agent-native/core/action";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "../server/db/index.js";
import { cancelKits } from "../server/db/schema.js";
import { requireOwner } from "../server/lib/owner.js";

export default defineAction({
  description: "Read the most recent cancellation kit saved for a subscription, if any.",
  schema: z.object({
    subscriptionId: z.string().describe("Subscription id"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ subscriptionId }, ctx) => {
    const owner = requireOwner(ctx);
    const [kit] = await getDb()
      .select()
      .from(cancelKits)
      .where(and(eq(cancelKits.subscriptionId, subscriptionId), eq(cancelKits.ownerEmail, owner)))
      .orderBy(desc(cancelKits.createdAt))
      .limit(1);
    return { kit: kit ?? null };
  },
});
