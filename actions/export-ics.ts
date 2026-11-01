import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { formatMinor } from "../server/lib/parse.js";
import { requireOwner } from "../server/lib/owner.js";
import { listSubscriptions } from "../server/lib/store.js";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export default defineAction({
  description: "Build an iCalendar (.ics) file of upcoming charges with a reminder the day before; the UI downloads it.",
  schema: z.object({
    days: z.coerce.number().int().min(1).max(400).default(60).describe("Include charges within this many days"),
  }),
  http: { method: "GET" },
  readOnly: true,
  mcpTool: false,
  run: async ({ days }, ctx) => {
    const rows = (await listSubscriptions(requireOwner(ctx), { withinDays: days })).filter(
      (r) => r.status !== "cancelled" && r.nextChargeDate,
    );
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const events = rows.flatMap((r) => {
      const d = r.nextChargeDate!.replace(/-/g, "");
      const what = r.kind === "trial" ? "Trial converts" : "Renews";
      return [
        "BEGIN:VEVENT",
        `UID:${r.id}-${d}@lapse`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d}`,
        `SUMMARY:${esc(`${what}: ${r.merchant} ${r.currency} ${formatMinor(r.amountMinor)}`)}`,
        `DESCRIPTION:${esc(`Lapse reminder. Decide before it charges. ${r.note}`.trim())}`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        `DESCRIPTION:${esc(`${r.merchant} charges tomorrow`)}`,
        "END:VALARM",
        "END:VEVENT",
      ];
    });
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lapse//Renewals//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
    return { filename: "lapse-renewals.ics", count: rows.length, ics };
  },
});
