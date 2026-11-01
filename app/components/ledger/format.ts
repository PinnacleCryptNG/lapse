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

export const FILTERS = [
  { id: "week", label: "This week" },
  { id: "30d", label: "30 days" },
  { id: "trials", label: "Trials" },
  { id: "unsure", label: "Unsure" },
  { id: "all", label: "All" },
] as const;
export type FilterId = (typeof FILTERS)[number]["id"];

export const LANGUAGES = ["English", "French", "Portuguese", "Spanish", "Hausa", "Yoruba", "Nigerian Pidgin"];

export const CADENCE_SHORT: Record<Sub["cadence"], string> = {
  weekly: "/wk",
  monthly: "/mo",
  quarterly: "/qtr",
  yearly: "/yr",
  unknown: "",
};

export function matchesFilter(s: Sub, f: FilterId): boolean {
  const d = s.daysLeft;
  switch (f) {
    case "week":
      return d !== null && d >= 0 && d <= 7;
    case "30d":
      return d !== null && d >= 0 && d <= 30;
    case "trials":
      return s.kind === "trial";
    case "unsure":
      return s.status === "unsure" || s.confidence < 60;
    default:
      return true;
  }
}

export function money(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
}

export function dueLabel(days: number | null): string {
  if (days === null) return "no date";
  if (days < 0) return `${-days}d ago`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

export function totals(rows: Sub[]) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.currency, (m.get(r.currency) ?? 0) + r.amountMinor);
  return [...m].map(([currency, amountMinor]) => ({ currency, amountMinor }));
}
