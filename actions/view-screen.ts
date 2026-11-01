import { defineAction } from "@agent-native/core/action";
import { readAppState, readAppStateForCurrentTab } from "@agent-native/core/application-state";
import { z } from "zod";

export default defineAction({
  description:
    "Read what the user is looking at in Lapse: which screen (add, decide or done) and, on the decide screen, the subscription card on top (currentCardId). Call this when the user says 'this' or 'this one'.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = await readAppState("navigation");
    const selection = await readAppStateForCurrentTab("selection", { fallbackToGlobal: true });

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;
    if (selection) {
      screen.screen = selection.screen ?? null;
      screen.currentCardId = selection.openId ?? null;
      screen.selectedSubscriptionIds = selection.subscriptionIds ?? [];
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
