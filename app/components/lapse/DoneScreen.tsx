import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconCopy, IconMail } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { dueText, type Kit, LANGUAGES, money, PER, type Status, type Sub, yearlyTotals } from "./format";
import { useTicker } from "./useTicker";

function Figure({ currency, minor }: { currency: string; minor: number }) {
  const shown = useTicker(minor, 1100);
  return <span className="lp-save__fig">{money(shown, currency)}</span>;
}

function Steps({ md }: { md: string }) {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <ol className="lp-kit__steps">
      {lines.map((l, i) => (
        <li key={i}>{l.replace(/^(\d+[.)]|[-*])\s*/, "").replace(/\*+/g, "")}</li>
      ))}
    </ol>
  );
}

function CancelItem({
  row,
  index,
  flashed,
  onStatus,
}: {
  row: Sub;
  index: number;
  flashed: boolean;
  onStatus: (row: Sub, s: Status) => void;
}) {
  const done = row.status === "cancelled";
  const { data } = useActionQuery("get-cancel-kit", { subscriptionId: row.id } as any);
  const kit = ((data as any)?.kit ?? null) as Kit | null;
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("English");
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    if (!kit) return;
    if (writing) setOpen(true);
    setWriting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kit?.id]);
  useEffect(() => {
    if (!writing) return;
    const t = setTimeout(() => setWriting(false), 90_000);
    return () => clearTimeout(t);
  }, [writing]);

  const write = () => {
    setWriting(true);
    sendToAgentChat({
      message: `Write the cancel message for ${row.merchant} (subscription ${row.id}) in ${lang}.`,
      submit: true,
    });
  };
  const full = kit ? (kit.messageSubject ? `Subject: ${kit.messageSubject}\n\n` : "") + kit.messageBody : "";
  const mailto = kit
    ? `mailto:?subject=${encodeURIComponent(kit.messageSubject ?? `Cancel my ${row.merchant} subscription`)}&body=${encodeURIComponent(kit.messageBody)}`
    : "";

  return (
    <li
      className={`lp-cancel${done ? " is-done" : ""}${flashed ? " is-agent" : ""}`}
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="lp-cancel__head">
        <div>
          <b className="lp-cancel__name">{row.merchant}</b>
          <span className="lp-cancel__meta">
            {money(row.amountMinor, row.currency)}
            {PER[row.cadence]} · {done ? "cancelled" : dueText(row.daysLeft).toLowerCase()}
          </span>
        </div>
        {done ? (
          <span className="lp-tag lp-tag--done">Cancelled</span>
        ) : kit ? (
          <span className="lp-tag lp-tag--ready">Message ready</span>
        ) : null}
      </div>

      {!done && !kit && (
        <div className="lp-cancel__write">
          <select className="lp-select" value={lang} aria-label="Language" onChange={(e) => setLang(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <button type="button" className="lp-btn lp-btn--dark" onClick={write} disabled={writing}>
            {writing ? "Lapse is writing…" : "Write my cancel message"}
          </button>
        </div>
      )}

      {!done && kit && (
        <>
          <button type="button" className="lp-link" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : "Show"} the steps and message
          </button>
          {open && (
            <div className="lp-kit">
              <Steps md={kit.stepsMd} />
              <div className="lp-kit__msg">
                {kit.messageSubject && <b>{kit.messageSubject}</b>}
                <p>{kit.messageBody}</p>
              </div>
              <small>Check the steps on {row.merchant}&apos;s own site. Lapse never sends this; you do.</small>
            </div>
          )}
          <div className="lp-cancel__actions">
            <button
              type="button"
              className="lp-btn lp-btn--dark"
              onClick={async () => {
                await navigator.clipboard.writeText(full);
                toast.success("Message copied");
              }}
            >
              <IconCopy size={16} stroke={1.9} /> Copy message
            </button>
            <a className="lp-btn lp-btn--ghost" href={mailto}>
              <IconMail size={16} stroke={1.9} /> Open in mail
            </a>
          </div>
        </>
      )}

      {!done && (
        <div className="lp-cancel__foot">
          <button type="button" className="lp-btn lp-btn--keep lp-btn--sm" onClick={() => onStatus(row, "cancelled")}>
            I&apos;ve cancelled it
          </button>
          <button type="button" className="lp-link" onClick={() => onStatus(row, "keep")}>
            Keep it instead
          </button>
        </div>
      )}
    </li>
  );
}

export function DoneScreen({
  cancelling,
  kept,
  flashed,
  onStatus,
  onReopen,
  onAdd,
  onAsk,
}: {
  cancelling: Sub[];
  kept: Sub[];
  flashed: Set<string>;
  onStatus: (row: Sub, s: Status) => void;
  onReopen: (row: Sub) => void;
  onAdd: () => void;
  onAsk: (message: string) => void;
}) {
  const yearly = yearlyTotals(cancelling);
  const doneCount = cancelling.filter((r) => r.status === "cancelled").length;
  const ordered = [...cancelling].sort(
    (a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled") || (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999),
  );

  return (
    <section className="lp-done lp-enter">
      {cancelling.length ? (
        <div className="lp-save">
          <span className="lp-save__lead">You&apos;ll save</span>
          <div className="lp-save__figs">
            {yearly.map((t) => (
              <Figure key={t.currency} currency={t.currency} minor={t.amountMinor} />
            ))}
          </div>
          <span className="lp-save__sub">
            a year by cancelling {cancelling.length} subscription{cancelling.length === 1 ? "" : "s"}
            {doneCount ? ` · ${doneCount} done` : ""}
          </span>
        </div>
      ) : (
        <div className="lp-save lp-save--none">
          <h1 className="lp-h1">Nothing to cancel.</h1>
          <p className="lp-lede">You&apos;re keeping everything. Add more charges any time.</p>
        </div>
      )}

      {cancelling.length > 0 && (
        <>
          <div className="lp-row-head">
            <h2 className="lp-h2">Cancel these</h2>
            <button
              type="button"
              className="lp-link"
              onClick={() => onAsk("Write the cancel messages for everything on my cancel list that doesn't have one yet, in English.")}
            >
              Write all with Lapse
            </button>
          </div>
          <ol className="lp-cancels">
            {ordered.map((r, i) => (
              <CancelItem key={r.id} row={r} index={i} flashed={flashed.has(r.id)} onStatus={onStatus} />
            ))}
          </ol>
        </>
      )}

      {kept.length > 0 && (
        <details className="lp-kept">
          <summary>Keeping {kept.length}</summary>
          <ul>
            {kept.map((r) => (
              <li key={r.id}>
                <span>{r.merchant}</span>
                <span className="lp-kept__amt">
                  {money(r.amountMinor, r.currency)}
                  {PER[r.cadence]}
                </span>
                <button type="button" className="lp-link" onClick={() => onReopen(r)}>
                  Change
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button type="button" className="lp-btn lp-btn--ghost lp-btn--block" onClick={onAdd}>
        Add more charges
      </button>
    </section>
  );
}
