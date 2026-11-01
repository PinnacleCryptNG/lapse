import type { Cadence, Status } from "../db/schema.js";

/** A single money movement parsed from a statement, CSV row, or email. */
export interface Charge {
  date: string; // YYYY-MM-DD
  description: string;
  amountMinor: number;
  currency: string;
}

export interface ParseResult {
  charges: Charge[];
  skipped: string[];
}

export interface EmailFinding {
  merchant: string;
  amountMinor: number | null;
  currency: string | null;
  date: string | null;
  kind: "trial" | "subscription";
  cadence: Cadence;
  raw: string;
}

export interface Candidate {
  key: string;
  merchant: string;
  rawDescriptor: string;
  amountMinor: number;
  currency: string;
  cadence: Cadence;
  kind: "subscription" | "trial";
  lastChargeDate: string | null;
  nextChargeDate: string | null;
  trialEnds: string | null;
  category: string;
  confidence: number;
  status: Extract<Status, "detected" | "unsure">;
  note: string;
  chargeCount: number;
}

// ---------- dates ----------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON_RE = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const DAY_MS = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function isoDate(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || y < 1970 || y > 2100) return null;
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

const monthNum = (s: string) => MONTHS.indexOf(s.slice(0, 3).toLowerCase()) + 1;

const DATE_PATTERNS: Array<{ re: RegExp; toIso: (m: RegExpExecArray) => string | null }> = [
  { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, toIso: (m) => isoDate(+m[1]!, +m[2]!, +m[3]!) },
  { re: /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/, toIso: (m) => isoDate(+m[3]!, +m[2]!, +m[1]!) },
  {
    re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON_RE},?\\s+(\\d{4})\\b`, "i"),
    toIso: (m) => isoDate(+m[3]!, monthNum(m[2]!), +m[1]!),
  },
  {
    re: new RegExp(`\\b${MON_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "i"),
    toIso: (m) => isoDate(+m[3]!, monthNum(m[1]!), +m[2]!),
  },
];

/** Earliest date in the text, with its position so callers can cut it out. */
export function findDate(text: string): { iso: string; index: number; length: number } | null {
  let best: { iso: string; index: number; length: number } | null = null;
  for (const { re, toIso } of DATE_PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    const iso = toIso(m);
    if (iso && (!best || m.index < best.index)) best = { iso, index: m.index, length: m[0].length };
  }
  return best;
}

export function parseDate(text: string): string | null {
  return findDate(text)?.iso ?? null;
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

export function addDays(iso: string, n: number): string {
  return new Date(toUtc(iso) + n * DAY_MS).toISOString().slice(0, 10);
}

export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return isoDate(ny, nm, Math.min(d, daysInMonth(ny, nm)))!;
}

export function addCadence(iso: string, cadence: Cadence): string | null {
  switch (cadence) {
    case "weekly":
      return addDays(iso, 7);
    case "monthly":
      return addMonths(iso, 1);
    case "quarterly":
      return addMonths(iso, 3);
    case "yearly":
      return addMonths(iso, 12);
    default:
      return null;
  }
}

// ---------- amounts ----------

const ISO_CODES = ["NGN", "GBP", "USD", "EUR", "INR", "KES", "ZAR", "BRL", "GHS", "CAD", "AUD"];
const SYMBOLS: Record<string, string> = {
  R$: "BRL",
  KSh: "KES",
  Ksh: "KES",
  "₦": "NGN",
  "£": "GBP",
  "€": "EUR",
  "₹": "INR",
  $: "USD",
  R: "ZAR",
};
const SYM_RE = "R\\$|KSh|Ksh|₦|£|€|₹|\\$|R";
const ISO_RE = ISO_CODES.join("|");
const NUM_RE = "\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+,\\d{2}(?!\\d)|\\d+(?:\\.\\d{1,2})?";
const AMOUNT_RE = new RegExp(
  `(?<![A-Za-z0-9])(?:(${ISO_RE})\\s?)?(?:(${SYM_RE})\\s?)?-?(${NUM_RE})(?:\\s?(${ISO_RE})(?![A-Za-z]))?`,
  "g",
);

export interface AmountMatch {
  amountMinor: number;
  currency: string | null;
  index: number;
  length: number;
  hasDecimal: boolean;
}

function toMinor(num: string): number {
  const normalised = /^\d+,\d{2}$/.test(num) ? num.replace(",", ".") : num.replace(/,/g, "");
  return Math.round(Number.parseFloat(normalised) * 100);
}

export function currencyFromToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const t = token.trim();
  if (SYMBOLS[t]) return SYMBOLS[t];
  const up = t.toUpperCase();
  return /^[A-Z]{3}$/.test(up) ? up : null;
}

export function findAmounts(text: string): AmountMatch[] {
  const out: AmountMatch[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    if (!m[3]) continue;
    out.push({
      amountMinor: toMinor(m[3]),
      currency: currencyFromToken(m[1] ?? m[4] ?? m[2]),
      index: m.index ?? 0,
      length: m[0].length,
      hasDecimal: /[.,]\d{2}$/.test(m[3]),
    });
  }
  return out;
}

function pickAmount(text: string): AmountMatch | null {
  const all = findAmounts(text);
  return (
    [...all].reverse().find((a) => a.currency) ?? [...all].reverse().find((a) => a.hasDecimal) ?? null
  );
}

// ---------- statements ----------

function cleanDescription(s: string): string {
  return s
    .replace(/\b(DR|CR|DEBIT)\b\.?$/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s|,;:-]+|[\s|,;:-]+$/g, "")
    .trim();
}

/** Parse free-text statement lines: a date, a description, and an amount with a currency. */
export function parseStatement(text: string): ParseResult {
  const charges: Charge[] = [];
  const skipped: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const date = findDate(line);
    if (!date) {
      skipped.push(line);
      continue;
    }
    const rest = line.slice(0, date.index) + " " + line.slice(date.index + date.length);
    const amount = pickAmount(rest);
    if (!amount || !amount.currency) {
      skipped.push(line);
      continue;
    }
    const description = cleanDescription(
      rest.slice(0, amount.index) + " " + rest.slice(amount.index + amount.length),
    );
    if (!description) {
      skipped.push(line);
      continue;
    }
    charges.push({ date: date.iso, description, amountMinor: amount.amountMinor, currency: amount.currency });
  }
  return { charges, skipped };
}

// ---------- CSV ----------

export function splitCsvLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      cells.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/** Parse a CSV export, sniffing the header for date / description / amount / currency columns. */
export function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { charges: [], skipped: [] };
  const header = lines[0]!;
  const sep = (header.match(/;/g)?.length ?? 0) > (header.match(/,/g)?.length ?? 0) ? ";" : ",";
  const heads = splitCsvLine(header, sep).map((h) => h.toLowerCase());
  const col = (re: RegExp) => heads.findIndex((h) => re.test(h));
  let di = col(/date|posted|time/);
  let si = col(/desc|narrat|detail|merchant|payee|memo|particular|name/);
  let ai = col(/amount|debit|value|sum|withdraw/);
  let ci = col(/curr|ccy/);
  let start = 1;
  if (di < 0 || ai < 0) {
    if (!findDate(header)) return { charges: [], skipped: lines };
    [di, si, ai, ci, start] = [0, 1, 2, 3, 0];
  }
  const charges: Charge[] = [];
  const skipped: string[] = [];
  for (const line of lines.slice(start)) {
    const cells = splitCsvLine(line, sep);
    const date = parseDate(cells[di] ?? "");
    const amount = findAmounts(cells[ai] ?? "")[0];
    const currency = currencyFromToken(ci >= 0 ? cells[ci] : null) ?? amount?.currency ?? null;
    const description = cleanDescription(si >= 0 ? (cells[si] ?? "") : "");
    if (!date || !amount || !currency || !description) {
      skipped.push(line);
      continue;
    }
    charges.push({ date, description, amountMinor: amount.amountMinor, currency });
  }
  return { charges, skipped };
}

// ---------- emails ----------

export function splitEmails(text: string): string[] {
  let parts = text.split(/\n\s*(?:-{3,}|={3,})\s*\n/);
  if (parts.length === 1) parts = text.split(/\n\s*\n/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

const MERCHANT_RES = [
  /(?:free trial of|trial of|trial for|subscription to|subscription for|plan for|membership (?:to|of|for))\s+([A-Z0-9][\w&.'+-]*(?:\s+[A-Z0-9][\w&.'+-]*){0,3})/,
  /^from:\s*"?([^"<\n]+?)"?\s*</im,
];

function cadenceFromText(text: string): Cadence {
  if (/\/\s?(?:year|yr|annum)\b|per year|a year|annual|yearly/i.test(text)) return "yearly";
  if (/\/\s?(?:quarter)\b|per quarter|quarterly/i.test(text)) return "quarterly";
  if (/\/\s?(?:month|mo)\b|per month|a month|monthly/i.test(text)) return "monthly";
  if (/\/\s?(?:week|wk)\b|per week|a week|weekly/i.test(text)) return "weekly";
  return "unknown";
}

/** Extract merchant, amount and the "trial ends / renews / will be charged on" date from emails. */
export function parseEmails(text: string, today = todayIso()): EmailFinding[] {
  const out: EmailFinding[] = [];
  for (const raw of splitEmails(text)) {
    let merchant: string | null = null;
    for (const re of MERCHANT_RES) {
      const m = re.exec(raw);
      if (m) {
        merchant = m[1]!.replace(/[.,]+$/, "").trim();
        break;
      }
    }
    if (!merchant) continue;
    const known = matchAlias(merchant);
    if (known) merchant = known.merchant;

    let date: string | null = null;
    const anchor = /(?:ends?|ending|renews?|renewing|charged|billed|expires?)\s+(?:on\s+)?(.{0,40})/i.exec(raw);
    if (anchor) date = parseDate(anchor[1]!);
    const inDays = /\bin\s+(\d{1,3})\s+days?\b/i.exec(raw);
    if (!date && inDays) date = addDays(today, Number(inDays[1]));
    if (!date) date = parseDate(raw);

    const amount = findAmounts(raw).find((a) => a.currency) ?? null;
    out.push({
      merchant,
      amountMinor: amount?.amountMinor ?? null,
      currency: amount?.currency ?? null,
      date,
      kind: /\btrial\b/i.test(raw) ? "trial" : "subscription",
      cadence: cadenceFromText(raw),
      raw,
    });
  }
  return out;
}

// ---------- merchants ----------

const ALIASES: Array<[RegExp, string, string]> = [
  [/NFLX|NETFLIX/i, "Netflix", "streaming"],
  [/SPOTIFY/i, "Spotify", "music"],
  [/YOUTUBE|YT\s*PREMIUM/i, "YouTube Premium", "streaming"],
  [/ADOBE/i, "Adobe Creative Cloud", "software"],
  [/CANVA/i, "Canva", "software"],
  [/ICLOUD|APPLE\.COM\/BILL|APPLE COM BILL/i, "iCloud", "cloud"],
  [/DSTV|MULTICHOICE/i, "DStv", "tv"],
  [/NOTION/i, "Notion", "software"],
  [/UBER\s*\*?\s*ONE/i, "Uber One", "transport"],
  [/AUDIBLE/i, "Audible", "books"],
  [/AMZN\s*PRIME|AMAZON\s*PRIME|PRIME\s*VIDEO/i, "Amazon Prime", "streaming"],
  [/SHOWMAX/i, "Showmax", "streaming"],
  [/DISNEY/i, "Disney+", "streaming"],
  [/DROPBOX/i, "Dropbox", "cloud"],
  [/GOOGLE\s*\*?\s*(?:ONE|STORAGE)/i, "Google One", "cloud"],
  [/CHATGPT|OPENAI/i, "ChatGPT", "software"],
];
const PROCESSORS = /^(PAYPAL|PP|SQ|SQUARE|PADDLE|STRIPE|GOOGLE|APPLE|PAYSTACK|FLW|FLUTTERWAVE)$/;
const CITY_SUFFIX =
  /\s+(LAGOS|ABUJA|IKEJA|LEKKI|NAIROBI|LONDON|DUBLIN|AMSTERDAM|LUXEMBOURG|SAN FRANCISCO|NEW YORK|SAN JOSE|MOUNTAIN VIEW|SYDNEY|MUMBAI|BANGALORE|BENGALURU|JOHANNESBURG|CAPE TOWN|SAO PAULO|PARIS|BERLIN|NG|GB|UK|US|USA|IE|KE|IN|ZA|BR|NL|LU|CA)$/;
const NOISE_WORDS = /\b(POS|PURCHASE|CARD|PAYMENT|DEBIT|ONLINE|WEB|TRF|TRANSFER|REF|INTL|DIGITAL|ORDER|RIDE|TRIP)\b/g;
const SUBSCRIPTION_HINT = /GYM|FIT|YOGA|PREMIUM|\bPRO\b|PLUS|SUBSCRIPTION|MEMBERSHIP|MONTHLY|ANNUAL|\bAPP\b|CLOUD|STREAM|MUSIC/i;

function matchAlias(raw: string): { merchant: string; category: string } | null {
  for (const [re, merchant, category] of ALIASES) if (re.test(raw)) return { merchant, category };
  return null;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

/** Map a raw card descriptor ("NFLX*DIGITAL LAGOS") to a clean merchant name ("Netflix"). */
export function normalizeMerchant(raw: string): { merchant: string; category: string; known: boolean } {
  const alias = matchAlias(raw);
  if (alias) return { ...alias, known: true };
  let s = raw.toUpperCase();
  if (s.includes("*")) {
    const parts = s.split("*").map((p) => p.trim()).filter(Boolean);
    s = parts.length > 1 && PROCESSORS.test(parts[0]!) ? parts[1]! : (parts[0] ?? s);
  }
  s = s
    .replace(/[#\d]+/g, " ")
    .replace(NOISE_WORDS, " ")
    .replace(/[^A-Z&+' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let prev = "";
  while (s && s !== prev) {
    prev = s;
    s = s.replace(CITY_SUFFIX, "").trim();
  }
  const merchant = titleCase(s || raw.trim());
  const category = /GYM|FIT|YOGA/i.test(raw) ? "fitness" : "other";
  return { merchant, category, known: false };
}

// ---------- cadence + detection ----------

export const CADENCE_DAYS: Record<Exclude<Cadence, "unknown">, number> = {
  weekly: 7,
  monthly: 30.44,
  quarterly: 91.31,
  yearly: 365.25,
};

export function median(xs: number[]): number {
  if (!xs.length) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function cadenceFromGap(days: number): Cadence {
  if (days >= 6 && days <= 8) return "weekly";
  if (days >= 26 && days <= 33) return "monthly";
  if (days >= 85 && days <= 95) return "quarterly";
  if (days >= 350 && days <= 380) return "yearly";
  return "unknown";
}

export function formatMinor(minor: number): string {
  return (minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Group charges by merchant+currency, infer cadence and confidence, and flag traps. Pure. */
export function detectRecurring(
  charges: Charge[],
  opts: { today?: string } = {},
): { candidates: Candidate[]; ignored: Array<{ merchant: string; currency: string; count: number }> } {
  const today = opts.today ?? todayIso();
  const groups = new Map<string, { merchant: string; category: string; known: boolean; items: Charge[] }>();
  for (const c of charges) {
    const n = normalizeMerchant(c.description);
    const key = `${slug(n.merchant)}:${c.currency}`;
    const g = groups.get(key) ?? { ...n, items: [] };
    g.items.push(c);
    groups.set(key, g);
  }

  const candidates: Candidate[] = [];
  const ignored: Array<{ merchant: string; currency: string; count: number }> = [];

  for (const [key, g] of groups) {
    const items = [...g.items].sort((a, b) => a.date.localeCompare(b.date));
    const currency = items[0]!.currency;
    const gaps = items.slice(1).map((c, i) => daysBetween(items[i]!.date, c.date));
    const cadence = gaps.length ? cadenceFromGap(median(gaps)) : "unknown";
    const amounts = items.map((c) => c.amountMinor);
    const steady = Math.max(...amounts) <= Math.min(...amounts) * 1.5;
    const recurring = gaps.length > 0 && cadence !== "unknown" && steady;
    const subLike = g.known || SUBSCRIPTION_HINT.test(items.map((i) => i.description).join(" "));
    if (!recurring && !(subLike && (items.length === 1 || g.known))) {
      ignored.push({ merchant: g.merchant, currency, count: items.length });
      continue;
    }

    let confidence: number;
    if (items.length === 1) {
      confidence = 30;
    } else if (cadence === "unknown") {
      confidence = 40;
    } else {
      const base = items.length === 2 ? 60 : items.length === 3 ? 75 : 85;
      const expected = CADENCE_DAYS[cadence];
      const dev = Math.max(...gaps.map((gap) => Math.abs(gap - expected) / expected));
      confidence = base - Math.min(30, Math.round(dev * 100)) + (g.known ? 10 : 0);
    }
    confidence = clamp(confidence, 5, 98);

    const last = items[items.length - 1]!;
    let next = addCadence(last.date, cadence);
    while (next && next < today) next = addCadence(next, cadence);

    const notes: string[] = [];
    if (items.length >= 2) {
      const prev = items[items.length - 2]!.amountMinor;
      if (last.amountMinor > prev * 1.05) {
        const pct = Math.round(((last.amountMinor - prev) / prev) * 100);
        notes.push(
          `Price rise: ${currency} ${formatMinor(prev)} → ${formatMinor(last.amountMinor)} (+${pct}%).`,
        );
      }
    }
    const status = confidence < 60 ? "unsure" : "detected";
    if (status === "unsure") {
      notes.unshift(
        items.length === 1
          ? `Only one charge seen — is ${g.merchant} a recurring subscription?`
          : `Charges look irregular — is ${g.merchant} still active?`,
      );
    }

    candidates.push({
      key,
      merchant: g.merchant,
      rawDescriptor: last.description,
      amountMinor: last.amountMinor,
      currency,
      cadence,
      kind: "subscription",
      lastChargeDate: last.date,
      nextChargeDate: next,
      trialEnds: null,
      category: g.category,
      confidence,
      status,
      note: notes.join(" "),
      chargeCount: items.length,
    });
  }

  flagDuplicates(candidates);
  candidates.sort((a, b) => (a.nextChargeDate ?? "9999").localeCompare(b.nextChargeDate ?? "9999"));
  return { candidates, ignored };
}

/** Same merchant billed in more than one currency is a likely double subscription. */
export function flagDuplicates(candidates: Candidate[]): void {
  const byMerchant = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const list = byMerchant.get(c.merchant) ?? [];
    list.push(c);
    byMerchant.set(c.merchant, list);
  }
  for (const list of byMerchant.values()) {
    const currencies = new Set(list.map((c) => c.currency));
    if (currencies.size < 2) continue;
    for (const c of list) {
      const others = [...currencies].filter((cur) => cur !== c.currency).join(", ");
      const flag = `Possible duplicate: ${c.merchant} is also billed in ${others}.`;
      if (!c.note.includes("Possible duplicate")) c.note = [c.note, flag].filter(Boolean).join(" ");
    }
  }
}

/** Turn an email finding into a table candidate. Missing amounts stay at 0 and are flagged, never guessed. */
export function emailToCandidate(f: EmailFinding): Candidate {
  const hasAll = f.amountMinor !== null && !!f.currency && !!f.date;
  const confidence = hasAll ? 85 : 40;
  const notes: string[] = [];
  if (f.amountMinor === null) notes.push(`Amount not found in the email — what will ${f.merchant} charge?`);
  else if (!f.date) notes.push(`No charge date found — when does ${f.merchant} bill you?`);
  if (f.kind === "trial" && f.date) notes.push(`Free trial converts to paid on ${f.date}.`);
  const alias = matchAlias(f.merchant);
  return {
    key: `${slug(f.merchant)}:${f.currency ?? "XXX"}`,
    merchant: f.merchant,
    rawDescriptor: f.raw.slice(0, 200),
    amountMinor: f.amountMinor ?? 0,
    currency: f.currency ?? "XXX",
    cadence: f.cadence,
    kind: f.kind,
    lastChargeDate: null,
    nextChargeDate: f.date,
    trialEnds: f.kind === "trial" ? f.date : null,
    category: alias?.category ?? "other",
    confidence,
    status: confidence < 60 ? "unsure" : "detected",
    note: notes.join(" "),
    chargeCount: 0,
  };
}

/** Yearly multiplier for a cadence (52 / 12 / 4 / 1); unknown cadences count once. */
export function perYear(cadence: Cadence): number {
  return cadence === "weekly" ? 52 : cadence === "monthly" ? 12 : cadence === "quarterly" ? 4 : 1;
}
