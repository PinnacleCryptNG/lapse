import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import {
  callAction,
  useActionMutation,
  useActionQuery,
  useDbSync,
  writeClientAppState,
} from "@agent-native/core/client/hooks";
import { IconCalendarDown, IconPencil, IconReceipt2, IconSparkles } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { TAB_ID } from "@/lib/tab-id";

import { DetailSheet } from "./DetailSheet";
import {
  CADENCE_SHORT,
  dueLabel,
  FILTERS,
  type FilterId,
  matchesFilter,
  money,
  shortDate,
  type Sub,
  totals,
} from "./format";
import { ImportSheet } from "./ImportSheet";
import { useTicker } from "./useTicker";

const FLASH_MS = 5200;
const TEAR_MS = 750;

function useAgentFlashes(rows: Sub[], ready: boolean, localEdits: React.MutableRefObject<Map<string, number>>) {
  const seen = useRef<Map<string, string> | null>(null);
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!ready) return;
    const prev = seen.current;
    const next = new Map(rows.map((r) => [r.id, r.updatedAt]));
    seen.current = next;
    if (!prev) return;
    const now = Date.now();
    const local = localEdits.current;
    const bulkLocal = (local.get("*") ?? 0) > now - 6000;
    const changed = rows.filter((r) => prev.get(r.id) !== r.updatedAt);
    const fromAgent = changed.filter(
      (r) => !bulkLocal && !((local.get(r.id) ?? 0) > now - 6000),
    );
    if (fromAgent.length === 0) return;
    setFlashes((f) => {
      const out = { ...f };
      for (const r of fromAgent) out[r.id] = now;
      return out;
    });
    const t = setTimeout(() => {
      setFlashes((f) => {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(f)) if (Date.now() - v < FLASH_MS) out[k] = v;
        return out;
      });
    }, FLASH_MS + 50);
    return () => clearTimeout(t);
  }, [rows, ready, localEdits]);
  return flashes;
}

function useTearing(rows: Sub[], ready: boolean) {
  const prev = useRef<Map<string, string> | null>(null);
  const [tearing, setTearing] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!ready) return;
    const before = prev.current;
    prev.current = new Map(rows.map((r) => [r.id, r.status]));
    if (!before) return;
    const torn = rows.filter((r) => r.status === "cancelled" && before.get(r.id) && before.get(r.id) !== "cancelled");
    if (!torn.length) return;
    setTearing((s) => new Set([...s, ...torn.map((r) => r.id)]));
    const t = setTimeout(() => {
      setTearing((s) => {
        const n = new Set(s);
        for (const r of torn) n.delete(r.id);
        return n;
      });
    }, TEAR_MS);
    return () => clearTimeout(t);
  }, [rows, ready]);
  return tearing;
}

function Fuse({ days }: { days: number | null }) {
  if (days === null) return <span className="lx-fuse lx-fuse--none" aria-hidden />;
  const left = Math.max(0, Math.min(30, days));
  const pct = Math.max(4, (left / 30) * 100);
  const heat = 1 - left / 30;
  return (
    <span
      className={`lx-fuse${days >= 0 && days <= 3 ? " lx-fuse--hot" : ""}`}
      title={`${days} days until the next charge`}
      style={{ "--fuse": `${pct}%`, "--heat": heat } as React.CSSProperties}
      aria-hidden
    />
  );
}

function Stamps({
  row,
  onStamp,
}: {
  row: Sub;
  onStamp: (status: "keep" | "cancel" | "unsure") => void;
}) {
  const [thunk, setThunk] = useState<string | null>(null);
  const hit = (s: "keep" | "cancel" | "unsure") => {
    setThunk(s);
    setTimeout(() => setThunk(null), 170);
    onStamp(s);
  };
  const on = (s: string) => row.status === s || (s === "cancel" && row.status === "cancel_drafted");
  return (
    <div className="lx-stamps" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`lx-stamp lx-stamp--keep${on("keep") ? " is-on" : ""}${thunk === "keep" ? " is-thunk" : ""}`}
        onClick={() => hit("keep")}
        aria-pressed={on("keep")}
      >
        KEEP
      </button>
      <button
        type="button"
        className={`lx-stamp lx-stamp--void${on("cancel") ? " is-on" : ""}${thunk === "cancel" ? " is-thunk" : ""}`}
        onClick={() => hit("cancel")}
        aria-pressed={on("cancel")}
      >
        VOID
      </button>
      <button
        type="button"
        className={`lx-stamp lx-stamp--ask${on("unsure") ? " is-on" : ""}${thunk === "unsure" ? " is-thunk" : ""}`}
        onClick={() => hit("unsure")}
        aria-pressed={on("unsure")}
        aria-label="Not sure"
      >
        ?
      </button>
    </div>
  );
}

function SavedStub({ cancelled }: { cancelled: Sub[] }) {
  const { data } = useActionQuery("savings-summary", {});
  const per = ((data as any)?.perCurrency ?? []) as Array<{ currency: string; yearlyMinor: number; count: number }>;
  return (
    <section className="lx-stub" aria-label="Saved">
      <div className="lx-perf" aria-hidden />
      <div className="lx-stub__head">
        <h2 className="lx-serif">Saved</h2>
        <span className="lx-mono lx-dim">per year, by currency</span>
      </div>
      <div className="lx-till">
        {per.length === 0 ? (
          <span className="lx-mono lx-dim">Nothing cancelled yet. VOID a row, then mark it cancelled.</span>
        ) : (
          per.map((p) => <TillFigure key={p.currency} currency={p.currency} minor={p.yearlyMinor} />)
        )}
      </div>
      {cancelled.length > 0 && (
        <ul className="lx-stub__list">
          {cancelled.map((c) => (
            <li key={c.id} className="lx-mono">
              <span>{c.merchant}</span>
              <span className="lx-leader" aria-hidden />
              <span>
                {money(c.amountMinor, c.currency)}
                {CADENCE_SHORT[c.cadence]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TillFigure({ currency, minor }: { currency: string; minor: number }) {
  const shown = useTicker(minor);
  return (
    <div className="lx-till__fig">
      <span className="lx-till__cur">{currency}</span>
      <span className="lx-till__num">{money(shown, currency)}</span>
    </div>
  );
}

export function LedgerPage() {
  const queryClient = useQueryClient();
  useDbSync({
    queryClient,
    ignoreSource: TAB_ID,
    realtime: { reason: "agent and user co-edit the renewal table" },
  });

  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.some((f) => f.id === params.get("f")) ? params.get("f") : "30d") as FilterId;
  const openId = params.get("row");
  const [selected, setSelected] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const localEdits = useRef(new Map<string, number>());

  const { data, isLoading } = useActionQuery("list-subscriptions", {});
  const rows = useMemo(() => (((data as any)?.rows ?? []) as Sub[]), [data]);
  const flashes = useAgentFlashes(rows, data !== undefined, localEdits);
  const tearing = useTearing(rows, data !== undefined);

  const mark = useActionMutation("mark-status");
  const loadSample = useActionMutation("load-sample-data", {
    onSuccess: (r: any) => toast.success(`Loaded ${r?.inserted + r?.updated} sample rows. Sample data – illustrative amounts.`),
  });

  useEffect(() => {
    void writeClientAppState(
      `selection:${TAB_ID}`,
      { subscriptionIds: selected, openId: openId ?? null, filter },
      { requestSource: TAB_ID },
    );
  }, [selected, openId, filter]);

  const active = rows.filter((r) => r.status !== "cancelled" || tearing.has(r.id));
  const visible = active.filter((r) => matchesFilter(r, filter) || tearing.has(r.id));
  const cancelled = rows.filter((r) => r.status === "cancelled" && !tearing.has(r.id));
  const dueWeek = active.filter((r) => matchesFilter(r, "week") && r.status !== "cancel" && r.status !== "cancel_drafted");
  const isSample = rows.some((r) => r.source === "sample");
  const open = rows.find((r) => r.id === openId) ?? null;

  const setFilter = (f: FilterId) =>
    setParams((p) => {
      p.set("f", f);
      return p;
    });
  const setOpen = (id: string | null) =>
    setParams((p) => {
      if (id) p.set("row", id);
      else p.delete("row");
      return p;
    });

  const stamp = (row: Sub, status: "keep" | "cancel" | "unsure") => {
    localEdits.current.set(row.id, Date.now());
    mark.mutate({ id: row.id, status } as any);
  };
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const exportIcs = async () => {
    const r = (await callAction("export-ics", { days: 60 } as any)) as any;
    const url = URL.createObjectURL(new Blob([r.ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = r.filename ?? "lapse-renewals.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const askAgent = () =>
    sendToAgentChat({
      message: selected.length
        ? `Look at these ${selected.length} selected subscriptions and tell me which to keep or cancel.`
        : "Audit my renewal table: walk me through anything that needs my input, one question at a time.",
      submit: true,
    });

  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  return (
    <div className="lx-desk">
      <article className="lx-receipt">
        <header className="lx-head">
          <div className="lx-head__brand">
            <IconReceipt2 size={20} stroke={1.6} />
            <h1 className="lx-serif">Lapse</h1>
          </div>
          <p className="lx-serif lx-tagline">Never pay for something you forgot you had.</p>
          <div className="lx-mono lx-meta">
            <span>{today}</span>
            <span>
              {active.length} RECURRING · {cancelled.length} SAVED
            </span>
          </div>
          <div className="lx-due">
            <span className="lx-mono lx-due__label">DUE IN 7 DAYS</span>
            <div className="lx-due__figs">
              {dueWeek.length === 0 ? (
                <span className="lx-mono lx-dim">nothing</span>
              ) : (
                totals(dueWeek).map((t) => (
                  <span key={t.currency} className="lx-mono lx-due__fig">
                    {money(t.amountMinor, t.currency)}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="lx-actions">
            <button type="button" className="lx-btn lx-btn--ink" onClick={() => setImportOpen(true)}>
              Import
            </button>
            <button type="button" className="lx-btn" onClick={exportIcs} disabled={!rows.length}>
              <IconCalendarDown size={15} stroke={1.7} /> .ics
            </button>
            <button type="button" className="lx-btn lx-btn--ember" onClick={askAgent}>
              <IconSparkles size={15} stroke={1.7} />
              {selected.length ? `Ask Lapse about ${selected.length}` : "Audit with Lapse"}
            </button>
          </div>
        </header>

        <nav className="lx-filters" aria-label="Filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`lx-filter${filter === f.id ? " is-on" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="lx-filter__n">{active.filter((r) => matchesFilter(r, f.id)).length}</span>
            </button>
          ))}
        </nav>

        {isSample && <p className="lx-mono lx-sample">Sample data – illustrative amounts</p>}

        <div className="lx-table" role="table" aria-label="Renewals">
          <div className="lx-row lx-row--head" role="row">
            <span role="columnheader" />
            <span role="columnheader">Merchant</span>
            <span role="columnheader">Next charge</span>
            <span role="columnheader" className="lx-num">Amount</span>
            <span role="columnheader" className="lx-num">Conf.</span>
            <span role="columnheader">Stamp</span>
          </div>
          {isLoading && <p className="lx-mono lx-empty">Printing receipt…</p>}
          {!isLoading && rows.length === 0 && (
            <div className="lx-empty">
              <p className="lx-serif">No receipts yet.</p>
              <p className="lx-mono lx-dim">Paste a statement, upload a CSV, or try the sample.</p>
              <div className="lx-actions">
                <button type="button" className="lx-btn lx-btn--ink" onClick={() => setImportOpen(true)}>
                  Import
                </button>
                <button
                  type="button"
                  className="lx-btn"
                  onClick={() => {
                    localEdits.current.set("*", Date.now());
                    loadSample.mutate({} as any);
                  }}
                >
                  Load sample data
                </button>
              </div>
            </div>
          )}
          {!isLoading && rows.length > 0 && visible.length === 0 && (
            <p className="lx-mono lx-empty lx-dim">Nothing under this filter.</p>
          )}
          {visible.map((r) => {
            const flashing = r.id in flashes;
            return (
              <div
                key={r.id}
                role="row"
                tabIndex={0}
                data-status={r.status}
                className={`lx-row${flashing ? " is-agent" : ""}${tearing.has(r.id) ? " is-tearing" : ""}${
                  selected.includes(r.id) ? " is-selected" : ""
                }`}
                onClick={() => setOpen(r.id)}
                onKeyDown={(e) => e.key === "Enter" && setOpen(r.id)}
              >
                <span role="cell" className="lx-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.merchant}`}
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                </span>
                <span role="cell" className="lx-merchant">
                  <span className="lx-merchant__name">
                    {r.merchant}
                    {r.kind === "trial" && <span className="lx-trial">TRIAL</span>}
                    {flashing && (
                      <span className="lx-pen">
                        <IconPencil size={11} stroke={2} /> Lapse edited
                      </span>
                    )}
                  </span>
                  {r.note && <span className="lx-note">{r.note}</span>}
                </span>
                <span role="cell" className="lx-when">
                  <span className="lx-mono">
                    {shortDate(r.nextChargeDate)} <span className="lx-dim">{dueLabel(r.daysLeft)}</span>
                  </span>
                  <Fuse days={r.daysLeft} />
                </span>
                <span role="cell" className="lx-num lx-mono lx-amount">
                  {money(r.amountMinor, r.currency)}
                  <span className="lx-dim">{CADENCE_SHORT[r.cadence]}</span>
                </span>
                <span role="cell" className={`lx-num lx-mono lx-conf${r.confidence < 60 ? " is-low" : ""}`}>
                  {r.confidence}
                </span>
                <span role="cell">
                  <Stamps row={r} onStamp={(s) => stamp(r, s)} />
                </span>
                {(r.status === "cancel" || r.status === "cancel_drafted") && (
                  <span className="lx-void-mark" aria-hidden>
                    {r.status === "cancel_drafted" ? "KIT DRAFTED" : "VOID"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <SavedStub cancelled={cancelled} />

        <footer className="lx-mono lx-foot">
          Lapse never sends or cancels anything for you. Sample data is illustrative.
        </footer>
      </article>

      <ImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        onLocalBulk={() => localEdits.current.set("*", Date.now())}
      />
      <DetailSheet
        row={open}
        onClose={() => setOpen(null)}
        onLocalEdit={(id) => localEdits.current.set(id, Date.now())}
      />
    </div>
  );
}
