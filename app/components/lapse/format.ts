export type Sub = {
  id: string;
  merchant: string;
  rawDescriptor: string | null;
  amountMinor: number;
  currency: string;
  cadence: "weekly" | "monthly" | "quarterly" | "yearly" | "unknown";
  kind: "subscription" | "trial" | "one_off";
  lastChargeDate: string | null;
  nextChargeDate: string | null;
  trialEnds: string | null;
  category: string | null;
  status: "detected" | "keep" | "cancel" | "unsure" | "cancel_drafted" | "cancelled" | "snoozed";
  confidence: number;
  decidedBy: "user" | "agent" | null;
  note: string | null;
  source: string;
  updatedAt: string;
  daysLeft: number | null;
};

export type Kit = {
  id: string;
  subscriptionId: string;
  channel: string;
  stepsMd: string;
  messageSubject: string | null;
  messageBody: string;
  language: string;
  createdAt: string;
};

export type Status = Sub["status"];

export const SCREENS = ["add", "decide", "done"] as const;
export type Screen = (typeof SCREENS)[number];

export const LANGUAGES = ["English", "French", "Portuguese", "Spanish", "Hausa", "Yoruba", "Nigerian Pidgin"];

export const PER: Record<Sub["cadence"], string> = {
  weekly: "/week",
  monthly: "/month",
  quarterly: "/quarter",
  yearly: "/year",
  unknown: "",
};

const TIMES_A_YEAR: Record<Sub["cadence"], number> = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1, unknown: 1 };

export const isOpen = (s: Sub) => s.status === "detected" || s.status === "unsure";
export const isCancelling = (s: Sub) => s.status === "cancel" || s.status === "cancel_drafted" || s.status === "cancelled";
export const isKept = (s: Sub) => s.status === "keep" || s.status === "snoozed";

/** Soonest charge first, trials ahead on ties, undated last, skipped cards at the back. */
export function byUrgency(a: Sub, b: Sub, skipped: string[]): number {
  const sa = skipped.indexOf(a.id);
  const sb = skipped.indexOf(b.id);
  if (sa !== sb) return sa === -1 ? -1 : sb === -1 ? 1 : sa - sb;
  const da = a.daysLeft ?? 9999;
  const db = b.daysLeft ?? 9999;
  if (da !== db) return da - db;
  return (a.kind === "trial" ? 0 : 1) - (b.kind === "trial" ? 0 : 1);
}

export function money(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: minor % 100 === 0 && Math.abs(minor) >= 100000 ? 0 : 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export function dueText(days: number | null): string {
  if (days === null) return "No charge date found";
  if (days < 0) return `Charged ${-days} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "Charges today";
  if (days === 1) return "Charges tomorrow";
  return `Charges in ${days} days`;
}

export function longDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function tipFor(s: Sub): string {
  if (s.note) return s.note;
  if (s.kind === "trial") return "Free trial: it turns into a paid plan when it ends. Cancel now if you won't use it.";
  if (s.daysLeft !== null && s.daysLeft >= 0 && s.daysLeft <= 3) return "This charges very soon. Decide now so it doesn't slip through.";
  if (s.cadence === "yearly") return "A yearly charge. These are the easiest to forget. Still using it?";
  if (s.cadence === "unknown") return "Still using this?";
  return `You pay this every ${s.cadence.replace("ly", "")}. Still using it?`;
}

export function yearlyTotals(rows: Sub[]) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.currency, (m.get(r.currency) ?? 0) + r.amountMinor * TIMES_A_YEAR[r.cadence]);
  return [...m].map(([currency, amountMinor]) => ({ currency, amountMinor }));
}

export const STATUS_WORD: Record<Status, string> = {
  detected: "to decide",
  unsure: "check this",
  keep: "Keep",
  cancel: "Cancel",
  cancel_drafted: "Cancel (message ready)",
  cancelled: "Cancelled",
  snoozed: "Later",
};

export const CADENCE_WORD: Record<Sub["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  unknown: "Recurring",
};

export function hueFor(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function dueShort(days: number | null): string {
  if (days === null) return "no date";
  if (days < 0) return `${-days}d ago`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
