/**
 * Sample data – illustrative amounts.
 * Every merchant amount below is FICTIONAL and exists only to demo Lapse. FocusFlow Pro and
 * PixelVault Cloud are made-up products. Dates are generated relative to "today" so the demo
 * always shows renewals in the next few days.
 */
import { addDays, addMonths, todayIso } from "./lib/parse.js";

export const SAMPLE_LABEL = "Sample data – illustrative amounts";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} ${MON[m - 1]} ${y}`;
}

function slashDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const DATE_FORMATS = [longDate, slashDate, (iso: string) => iso];

const SYMBOL: Record<string, string> = { NGN: "₦", GBP: "£", EUR: "€", INR: "₹" };

function money(minorUnits: number, currency: string, style: number): string {
  const n = (minorUnits / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
  if (currency === "KES") return `KSh ${n}`;
  if (style % 2 === 0 && SYMBOL[currency]) return `${SYMBOL[currency]}${n}`;
  if (style % 2 === 0 && currency === "USD") return `$${n}`;
  return `${currency} ${n}`;
}

interface Recurring {
  descriptor: string;
  currency: string;
  amounts: [number, number, number]; // oldest → newest, major units
  dueInDays: number; // next renewal ≈ today + dueInDays
}

interface OneOff {
  descriptor: string;
  currency: string;
  amount: number;
  daysAgo: number;
}

/** Monthly charge dates so that last + 1 month ≈ today + dueInDays. */
function monthlyDates(today: string, dueInDays: number): [string, string, string] {
  const last = addMonths(addDays(today, dueInDays), -1);
  return [addMonths(last, -2), addMonths(last, -1), last];
}

function expand(today: string, recurring: Recurring[], oneOffs: OneOff[]) {
  const rows: Array<{ date: string; descriptor: string; minor: number; currency: string }> = [];
  for (const r of recurring) {
    monthlyDates(today, r.dueInDays).forEach((date, i) =>
      rows.push({ date, descriptor: r.descriptor, minor: Math.round(r.amounts[i]! * 100), currency: r.currency }),
    );
  }
  for (const o of oneOffs) {
    rows.push({
      date: addDays(today, -o.daysAgo),
      descriptor: o.descriptor,
      minor: Math.round(o.amount * 100),
      currency: o.currency,
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

const STATEMENT_RECURRING: Recurring[] = [
  { descriptor: "NETFLIX.COM", currency: "USD", amounts: [15.49, 15.49, 15.49], dueInDays: 2 },
  { descriptor: "SPOTIFY P1F2C3", currency: "USD", amounts: [11.99, 11.99, 11.99], dueInDays: 5 },
  { descriptor: "GOOGLE*YOUTUBE PREMIUM", currency: "USD", amounts: [13.99, 13.99, 13.99], dueInDays: 12 },
  { descriptor: "ADOBE *CREATIVE CLD", currency: "USD", amounts: [59.99, 59.99, 59.99], dueInDays: 20 },
  { descriptor: "CANVA* 104-2219", currency: "USD", amounts: [12.99, 12.99, 15.0], dueInDays: 6 },
  { descriptor: "APPLE.COM/BILL ICLOUD", currency: "USD", amounts: [2.99, 2.99, 2.99], dueInDays: 1 },
  { descriptor: "HULU 877-8244858", currency: "USD", amounts: [17.99, 17.99, 17.99], dueInDays: 14 },
  { descriptor: "NOTION LABS INC", currency: "USD", amounts: [10, 10, 10], dueInDays: 25 },
  { descriptor: "UBER *ONE", currency: "USD", amounts: [9.99, 9.99, 9.99], dueInDays: 17 },
  { descriptor: "AUDIBLE", currency: "USD", amounts: [14.95, 14.95, 14.95], dueInDays: 28 },
];

const STATEMENT_ONE_OFFS: OneOff[] = [
  { descriptor: "FITPULSE GYM APP", currency: "USD", amount: 4.99, daysAgo: 10 },
  { descriptor: "AMAZON MKTPLACE", currency: "USD", amount: 38.4, daysAgo: 64 },
  { descriptor: "WHOLEFDS MKT", currency: "USD", amount: 72.15, daysAgo: 41 },
  { descriptor: "UBER *TRIP", currency: "USD", amount: 18.2, daysAgo: 77 },
  { descriptor: "UBER *TRIP", currency: "USD", amount: 24.6, daysAgo: 30 },
  { descriptor: "STARBUCKS 0803", currency: "USD", amount: 6.75, daysAgo: 22 },
];

const CSV_RECURRING: Recurring[] = [
  { descriptor: "NETFLIX.COM", currency: "USD", amounts: [15.49, 15.49, 15.49], dueInDays: 2 },
  { descriptor: "SPOTIFY P1F2C3", currency: "USD", amounts: [11.99, 11.99, 11.99], dueInDays: 5 },
  { descriptor: "MAX.COM", currency: "USD", amounts: [16.99, 16.99, 16.99], dueInDays: 4 },
  { descriptor: "AMZN PRIME", currency: "USD", amounts: [14.99, 14.99, 14.99], dueInDays: 8 },
  { descriptor: "DISNEY PLUS", currency: "USD", amounts: [13.99, 13.99, 13.99], dueInDays: 15 },
  { descriptor: "DROPBOX*PLUS", currency: "USD", amounts: [11.99, 11.99, 11.99], dueInDays: 22 },
  { descriptor: "OPENAI *CHATGPT SUBSCR", currency: "USD", amounts: [20, 20, 20], dueInDays: 3 },
  { descriptor: "GOOGLE *GOOGLE ONE", currency: "USD", amounts: [2.99, 2.99, 2.99], dueInDays: 11 },
];

const CSV_ONE_OFFS: OneOff[] = [
  { descriptor: "UBER *TRIP", currency: "USD", amount: 18.2, daysAgo: 81 },
  { descriptor: "UBER *TRIP", currency: "USD", amount: 22.4, daysAgo: 66 },
  { descriptor: "UBER *TRIP", currency: "USD", amount: 14.1, daysAgo: 47 },
  { descriptor: "UBER *TRIP", currency: "USD", amount: 31.0, daysAgo: 19 },
  { descriptor: "UBER *TRIP", currency: "USD", amount: 19.75, daysAgo: 6 },
  { descriptor: "WHOLEFDS MKT", currency: "USD", amount: 72.15, daysAgo: 88 },
  { descriptor: "WHOLEFDS MKT", currency: "USD", amount: 41.3, daysAgo: 60 },
  { descriptor: "WHOLEFDS MKT", currency: "USD", amount: 58.9, daysAgo: 5 },
  { descriptor: "AMAZON MKTPLACE", currency: "USD", amount: 38.4, daysAgo: 64 },
  { descriptor: "AMAZON MKTPLACE", currency: "USD", amount: 12.99, daysAgo: 13 },
  { descriptor: "STARBUCKS 0803", currency: "USD", amount: 6.75, daysAgo: 80 },
  { descriptor: "STARBUCKS 0803", currency: "USD", amount: 5.4, daysAgo: 70 },
  { descriptor: "STARBUCKS 0803", currency: "USD", amount: 7.2, daysAgo: 12 },
  { descriptor: "CHIPOTLE 1123", currency: "USD", amount: 13.85, daysAgo: 60 },
  { descriptor: "CHIPOTLE 1123", currency: "USD", amount: 11.6, daysAgo: 25 },
  { descriptor: "DOORDASH*ORDER", currency: "USD", amount: 27.3, daysAgo: 3 },
];

export function sampleStatementText(today = todayIso()): string {
  const rows = expand(today, STATEMENT_RECURRING, STATEMENT_ONE_OFFS);
  const lines = rows.map((r, i) => {
    const date = DATE_FORMATS[i % DATE_FORMATS.length]!(r.date);
    return `${date}  ${r.descriptor.padEnd(28)} ${money(r.minor, r.currency, i)}`;
  });
  return [`${SAMPLE_LABEL}`, "Lapse Demo Bank — card ending 0000", ...lines].join("\n");
}

export function sampleCsvText(today = todayIso()): string {
  const rows = expand(today, CSV_RECURRING, CSV_ONE_OFFS);
  const body = rows.map(
    (r) => `${r.date},"${r.descriptor}",${(r.minor / 100).toFixed(2)},${r.currency}`,
  );
  return ["date,description,amount,currency", ...body].join("\n");
}

export function sampleEmailsText(today = todayIso()): string {
  return [
    `From: FocusFlow Pro <billing@focusflow.example>\nSubject: Your trial is ending\n\nYour 7-day free trial of FocusFlow Pro ends on ${longDate(addDays(today, 3))}. After that you'll be charged $39.99/year.`,
    `From: PixelVault Cloud <no-reply@pixelvault.example>\nSubject: Upcoming renewal\n\nYour annual plan for PixelVault Cloud renews on ${longDate(addDays(today, 10))} for $29.99.`,
  ].join("\n---\n");
}
