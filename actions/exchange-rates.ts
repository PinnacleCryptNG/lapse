import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

export const DISPLAY_CURRENCIES = ["USD", "NGN", "GBP", "EUR", "CAD", "AUD", "INR", "KES", "GHS", "ZAR", "JPY"] as const;

let cache: { at: number; updated: string; rates: Record<string, number> } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000;

export default defineAction({
  description:
    "Today's exchange rates with USD as the base (1 USD = rate units), from open.er-api.com, cached for 6 hours. Use only to show approximate converted totals; always say a converted figure is approximate and keep each subscription's own billing currency.",
  schema: z.object({}),
  http: { method: "GET" },
  readOnly: true,
  run: async () => {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Exchange rates unavailable (HTTP ${res.status})`);
      const data = (await res.json()) as { result?: string; time_last_update_utc?: string; rates?: Record<string, number> };
      if (data.result !== "success" || !data.rates) throw new Error("Exchange rates unavailable");
      cache = { at: Date.now(), updated: data.time_last_update_utc ?? "", rates: data.rates };
    }
    const rates: Record<string, number> = {};
    for (const [k, v] of Object.entries(cache.rates)) if (typeof v === "number" && v > 0) rates[k] = v;
    return { base: "USD", updated: cache.updated, source: "open.er-api.com", currencies: DISPLAY_CURRENCIES, rates };
  },
});
