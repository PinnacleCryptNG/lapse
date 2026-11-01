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
  { descriptor: "NFLX*DIGITAL LAGOS", currency: "NGN", amounts: [7000, 7000, 7000], dueInDays: 2 },
  { descriptor: "SPOTIFY P1F2C3 LAGOS", currency: "NGN", amounts: [1900, 1900, 1900], dueInDays: 5 },
  { descriptor: "GOOGLE*YOUTUBE PREMIUM", currency: "NGN", amounts: [2200, 2200, 2200], dueInDays: 12 },
  { descriptor: "ADOBE *CREATIVE CLD", currency: "NGN", amounts: [32000, 32000, 32000], dueInDays: 20 },
  { descriptor: "CANVA* 104-2219", currency: "NGN", amounts: [9500, 9500, 11000], dueInDays: 6 },
  { descriptor: "APPLE.COM/BILL ICLOUD", currency: "NGN", amounts: [1500, 1500, 1500], dueInDays: 1 },
  { descriptor: "DSTV MULTICHOICE LAGOS", currency: "NGN", amounts: [15700, 15700, 15700], dueInDays: 14 },
  { descriptor: "NOTION LABS INC", currency: "NGN", amounts: [16000, 16000, 16000], dueInDays: 25 },
  { descriptor: "UBER *ONE LAGOS", currency: "NGN", amounts: [2500, 2500, 2500], dueInDays: 17 },
  { descriptor: "AUDIBLE", currency: "NGN", amounts: [6500, 6500, 6500], dueInDays: 28 },
];

const STATEMENT_ONE_OFFS: OneOff[] = [
  { descriptor: "FITPULSE GYM APP", currency: "NGN", amount: 4500, daysAgo: 10 },
  { descriptor: "JUMIA*ORDER 77812", currency: "NGN", amount: 18900, daysAgo: 64 },
  { descriptor: "SHOPRITE IKEJA", currency: "NGN", amount: 23450, daysAgo: 41 },
  { descriptor: "BOLT*RIDE LAGOS", currency: "NGN", amount: 2350, daysAgo: 77 },
  { descriptor: "BOLT*RIDE LAGOS", currency: "NGN", amount: 4200, daysAgo: 30 },
  { descriptor: "MTN AIRTIME 0803", currency: "NGN", amount: 1000, daysAgo: 22 },
];

const CSV_RECURRING: Recurring[] = [
  { descriptor: "NFLX*DIGITAL LAGOS", currency: "NGN", amounts: [7000, 7000, 7000], dueInDays: 2 },
  { descriptor: "SPOTIFY P1F2C3 LAGOS", currency: "NGN", amounts: [1900, 1900, 1900], dueInDays: 5 },
  { descriptor: "SHOWMAX*PREMIUM", currency: "NGN", amounts: [4400, 4400, 4400], dueInDays: 4 },
  { descriptor: "AMZN PRIME VIDEO", currency: "NGN", amounts: [3500, 3500, 3500], dueInDays: 8 },
  { descriptor: "DISNEY PLUS", currency: "NGN", amounts: [5000, 5000, 5000], dueInDays: 15 },
  { descriptor: "DROPBOX*PLUS", currency: "NGN", amounts: [14000, 14000, 14000], dueInDays: 22 },
  { descriptor: "OPENAI *CHATGPT SUBSCR", currency: "NGN", amounts: [30000, 30000, 30000], dueInDays: 3 },
  { descriptor: "GOOGLE *GOOGLE ONE", currency: "NGN", amounts: [900, 900, 900], dueInDays: 11 },
];
const CSV_ONE_OFFS: OneOff[] = [
  { descriptor: "BOLT*RIDE LAGOS", currency: "NGN", amount: 2350, daysAgo: 81 },
  { descriptor: "BOLT*RIDE LAGOS", currency: "NGN", amount: 3100, daysAgo: 66 },
  { descriptor: "BOLT*RIDE LAGOS", currency: "NGN", amount: 1800, daysAgo: 47 },
  { descriptor: "BOLT*RIDE LAGOS", currency: "NGN", amount: 4200, daysAgo: 19 },
  { descriptor: "BOLT*RIDE LAGOS", currency: "NGN", amount: 2750, daysAgo: 6 },
  { descriptor: "SHOPRITE IKEJA", currency: "NGN", amount: 23450, daysAgo: 88 },
  { descriptor: "SHOPRITE IKEJA", currency: "NGN", amount: 8120, daysAgo: 60 },
  { descriptor: "SHOPRITE IKEJA", currency: "NGN", amount: 15300, daysAgo: 5 },
  { descriptor: "JUMIA*ORDER 77812", currency: "NGN", amount: 18900, daysAgo: 64 },
  { descriptor: "JUMIA*ORDER 80455", currency: "NGN", amount: 6500, daysAgo: 13 },
  { descriptor: "MTN AIRTIME 0803", currency: "NGN", amount: 1000, daysAgo: 80 },
  { descriptor: "MTN AIRTIME 0803", currency: "NGN", amount: 2000, daysAgo: 70 },
  { descriptor: "MTN AIRTIME 0803", currency: "NGN", amount: 500, daysAgo: 12 },
  { descriptor: "CHICKEN REPUBLIC LEKKI", currency: "NGN", amount: 5200, daysAgo: 60 },
  { descriptor: "CHICKEN REPUBLIC LEKKI", currency: "NGN", amount: 3900, daysAgo: 25 },
  { descriptor: "GLOVO LAGOS", currency: "NGN", amount: 7400, daysAgo: 3 },
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
    `From: FocusFlow Pro <billing@focusflow.example>\nSubject: Your trial is ending\n\nYour 7-day free trial of FocusFlow Pro ends on ${longDate(addDays(today, 3))}. After that you'll be charged ₦45,000/year.`,
    `From: PixelVault Cloud <no-reply@pixelvault.example>\nSubject: Upcoming renewal\n\nYour annual plan for PixelVault Cloud renews on ${longDate(addDays(today, 10))} for ₦38,000.`,
  ].join("\n---\n");
}
