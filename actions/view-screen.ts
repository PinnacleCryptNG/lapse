import { defineAction } from "@agent-native/core/action";
import { readAppState, readAppStateForCurrentTab } from "@agent-native/core/application-state";
import { z } from "zod";

export default defineAction({
  description:
    "Read what the user is looking at in Lapse: navigation, the subscription rows they have selected (selectedSubscriptionIds), the row open in the detail sheet, and the active filter. Call this when the user says 'this' or 'these'.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async () => {
    const navigation = await readAppState("navigation");
    const selection = await readAppStateForCurrentTab("selection", { fallbackToGlobal: true });

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;
    if (selection) {
      screen.selectedSubscriptionIds = selection.subscriptionIds ?? [];
      screen.openSubscriptionId = selection.openId ?? null;
      screen.activeFilter = selection.filter ?? null;
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
