import { createHash, randomUUID } from "node:crypto";

import { fail } from "@agent-native/core/action";
import { and, asc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";

import { getDb } from "../db/index.js";
import {
  imports,
  subscriptions,
  type Actor,
  type Source,
  type Status,
  type SubscriptionRow,
} from "../db/schema.js";
import {
  addDays,
  daysBetween,
  detectRecurring,
  emailToCandidate,
  parseCsv,
  parseEmailsDetailed,
  parseStatement,
  perYear,
  todayIso,
  type Candidate,
  type Charge,
} from "./parse.js";

export const nowIso = () => new Date().toISOString();

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function hash(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 16);
}

/** Deterministic per-user id so re-imports update the same row instead of duplicating it. */
export function subscriptionId(owner: string, key: string): string {
  return `sub_${hash(`${owner}|${key}`)}`;
}

export function importIdFor(owner: string, label: string): string {
  return `imp_${hash(`${owner}|${label}`)}`;
}

/** Who is calling: the browser UI is the user; chat tools, MCP, A2A and automations are the agent. */
export function actorFromCaller(caller?: string): Actor {
  return caller === "frontend" || caller === "cli" ? "user" : "agent";
}

export type ImportKind = "statement" | "csv" | "email";

export function parseImport(kind: ImportKind, text: string, today = todayIso()) {
  if (kind === "email") {
    const { findings: emails, skipped } = parseEmailsDetailed(text, today);
    return { charges: [] as Charge[], emails, skipped, rowCount: emails.length };
  }
  const { charges, skipped } = kind === "csv" ? parseCsv(text) : parseStatement(text);
  return { charges, emails: [], skipped, rowCount: charges.length };
}

export async function saveImport(owner: string, kind: ImportKind, text: string, id = newId("imp")) {
  const parsed = parseImport(kind, text);
  const db = getDb();
  await db.delete(imports).where(and(eq(imports.id, id), eq(imports.ownerEmail, owner)));
  await db.insert(imports).values({
    id,
    ownerEmail: owner,
    kind,
    rawText: text,
    rowCount: parsed.rowCount,
    createdAt: nowIso(),
  });
  return { importId: id, ...parsed };
}

const SETTLED: Status[] = ["keep", "cancel", "cancel_drafted", "cancelled", "snoozed"];

export async function upsertCandidates(owner: string, candidates: Candidate[], source: Source) {
  const db = getDb();
  const ids = candidates.map((c) => subscriptionId(owner, c.key));
  const existing = ids.length
    ? await db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.ownerEmail, owner), inArray(subscriptions.id, ids)))
    : [];
  const byId = new Map(existing.map((r) => [r.id, r]));
  let inserted = 0;
  let updated = 0;
  const protectedIds: string[] = [];
  for (const c of candidates) {
    const id = subscriptionId(owner, c.key);
    const prev = byId.get(id);
    const fields = {
      merchant: c.merchant,
      rawDescriptor: c.rawDescriptor,
      amountMinor: c.amountMinor,
      currency: c.currency,
      cadence: c.cadence,
      kind: c.kind,
      lastChargeDate: c.lastChargeDate,
      nextChargeDate: c.nextChargeDate,
      trialEnds: c.trialEnds,
      category: c.category,
      confidence: c.confidence,
      note: c.note,
      source,
      updatedAt: nowIso(),
    };
    if (!prev) {
      await db
        .insert(subscriptions)
        .values({ id, ownerEmail: owner, ...fields, status: c.status, decidedBy: "agent" });
      inserted++;
    } else if (prev.decidedBy === "user") {
      protectedIds.push(id);
    } else {
      await db
        .update(subscriptions)
        .set({ ...fields, status: SETTLED.includes(prev.status) ? prev.status : c.status })
        .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerEmail, owner)));
      updated++;
    }
  }
  return { inserted, updated, protectedIds };
}

/** Re-parse a stored import (deterministic), detect recurring charges, and upsert rows. */
export async function detectFromImport(owner: string, importId: string, source?: Source) {
  const db = getDb();
  const [imp] = await db
    .select()
    .from(imports)
    .where(and(eq(imports.id, importId), eq(imports.ownerEmail, owner)))
    .limit(1);
  if (!imp) fail(`Import ${importId} not found for this account.`, { errorCode: "not_found", statusCode: 404 });
  const kind = (imp.kind === "sample" ? "statement" : imp.kind) as ImportKind;
  const parsed = parseImport(kind, imp.rawText);
  const { candidates, ignored } = detectRecurring(parsed.charges);
  const all = [...candidates, ...parsed.emails.map(emailToCandidate)];
  const result = await upsertCandidates(owner, all, source ?? kind);
  return {
    importId,
    detected: all.length,
    ...result,
    ignored,
    candidates: all.map((c) => ({
      id: subscriptionId(owner, c.key),
      merchant: c.merchant,
      amountMinor: c.amountMinor,
      currency: c.currency,
      cadence: c.cadence,
      kind: c.kind,
      nextChargeDate: c.nextChargeDate,
      confidence: c.confidence,
      status: c.status,
      note: c.note,
    })),
  };
}

export type SubscriptionView = SubscriptionRow & { daysLeft: number | null };

export function withDaysLeft(row: SubscriptionRow, today = todayIso()): SubscriptionView {
  return { ...row, daysLeft: row.nextChargeDate ? daysBetween(today, row.nextChargeDate) : null };
}

export async function listSubscriptions(
  owner: string,
  opts: { status?: Status | undefined; withinDays?: number | undefined; currency?: string | undefined } = {},
): Promise<SubscriptionView[]> {
  const today = todayIso();
  const where: SQL[] = [eq(subscriptions.ownerEmail, owner)];
  if (opts.status) where.push(eq(subscriptions.status, opts.status));
  if (opts.currency) where.push(eq(subscriptions.currency, opts.currency.toUpperCase()));
  if (opts.withinDays !== undefined) {
    where.push(gte(subscriptions.nextChargeDate, today));
    where.push(lte(subscriptions.nextChargeDate, addDays(today, opts.withinDays)));
  }
  const rows = await getDb()
    .select()
    .from(subscriptions)
    .where(and(...where))
    .orderBy(asc(subscriptions.nextChargeDate), asc(subscriptions.merchant));
  return rows.map((r) => withDaysLeft(r, today));
}

export async function getSubscription(owner: string, id: string): Promise<SubscriptionRow> {
  const [row] = await getDb()
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerEmail, owner)))
    .limit(1);
  if (!row) fail(`Subscription ${id} not found for this account.`, { errorCode: "not_found", statusCode: 404 });
  return row;
}

export function totalsByCurrency(rows: Array<Pick<SubscriptionRow, "amountMinor" | "currency">>) {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.currency, (totals.get(r.currency) ?? 0) + r.amountMinor);
  return [...totals].map(([currency, amountMinor]) => ({ currency, amountMinor }));
}

export async function savingsSummary(owner: string) {
  const rows = await getDb()
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.ownerEmail, owner), eq(subscriptions.status, "cancelled")));
  const perCurrency = new Map<string, { yearlyMinor: number; count: number }>();
  for (const r of rows) {
    const cur = perCurrency.get(r.currency) ?? { yearlyMinor: 0, count: 0 };
    cur.yearlyMinor += r.amountMinor * perYear(r.cadence);
    cur.count++;
    perCurrency.set(r.currency, cur);
  }
  return {
    cancelledCount: rows.length,
    perCurrency: [...perCurrency].map(([currency, v]) => ({ currency, ...v })),
    cancelled: rows.map((r) => ({ id: r.id, merchant: r.merchant, amountMinor: r.amountMinor, currency: r.currency, cadence: r.cadence })),
  };
}
