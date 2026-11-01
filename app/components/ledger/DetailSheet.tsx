import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { type Kit, LANGUAGES, money, type Sub } from "./format";

const CADENCES = ["weekly", "monthly", "quarterly", "yearly", "unknown"] as const;

function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}

function Field({
  label,
  value,
  onSave,
  type = "text",
  options,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  options?: readonly string[];
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => v !== value && onSave(v);
  return (
    <label className="lx-field">
      <span className="lx-mono lx-field__label">{label}</span>
      {options ? (
        <select className="lx-input lx-mono" value={v} onChange={(e) => { setV(e.target.value); onSave(e.target.value); }}>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          className="lx-input lx-mono"
          type={type}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      )}
    </label>
  );
}

function Steps({ md }: { md: string }) {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <ol className="lx-steps">
      {lines.map((l, i) => (
        <li key={i}>{l.replace(/^(\d+[.)]|[-*])\s*/, "").replace(/\*+/g, "")}</li>
      ))}
    </ol>
  );
}

export function DetailSheet({
  row,
  onClose,
  onLocalEdit,
}: {
  row: Sub | null;
  onClose: () => void;
  onLocalEdit: (id: string) => void;
}) {
  const phone = useIsPhone();
  const [lang, setLang] = useState("English");
  const update = useActionMutation("update-subscription", {
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });
  const mark = useActionMutation("mark-status");
  const { data: kitData } = useActionQuery(
    "get-cancel-kit",
    { subscriptionId: row?.id ?? "" } as any,
    { enabled: Boolean(row) },
  );
  const kit = ((kitData as any)?.kit ?? null) as Kit | null;

  if (!row) return <Sheet open={false} />;

  const save = (patch: Record<string, unknown>) => {
    onLocalEdit(row.id);
    update.mutate({ id: row.id, actor: "user", patch } as any);
  };

  const draft = () => {
    sendToAgentChat({
      message: `Draft a cancellation kit for subscription ${row.id} (${row.merchant}) in ${lang}`,
      submit: true,
    });
    toast("Lapse is drafting the kit in chat. It will appear here.");
  };

  const fullMessage = kit ? (kit.messageSubject ? `Subject: ${kit.messageSubject}\n\n` : "") + kit.messageBody : "";
  const mailto = kit
    ? `mailto:?subject=${encodeURIComponent(kit.messageSubject ?? `Cancel my ${row.merchant} subscription`)}&body=${encodeURIComponent(kit.messageBody)}`
    : "";

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className="lx-sheet lx-detail"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetTitle className="lx-serif lx-sheet__title">{row.merchant}</SheetTitle>
        <SheetDescription className="lx-mono lx-dim">
          {row.rawDescriptor ?? row.source} · confidence {row.confidence}
          {row.decidedBy ? ` · decided by ${row.decidedBy === "agent" ? "Lapse" : "you"}` : ""}
        </SheetDescription>

        {row.note && (
          <p className="lx-agent-note">
            <span className="lx-mono">LAPSE NOTE</span>
            {row.note}
          </p>
        )}

        <div className="lx-fields">
          <Field label="Merchant" value={row.merchant} onSave={(v) => save({ merchant: v })} />
          <Field
            label={`Amount (${row.currency})`}
            type="number"
            value={(row.amountMinor / 100).toFixed(2)}
            onSave={(v) => {
              const n = Math.round(Number(v) * 100);
              if (Number.isFinite(n) && n >= 0) save({ amountMinor: n });
            }}
          />
          <Field label="Cadence" value={row.cadence} options={CADENCES} onSave={(v) => save({ cadence: v })} />
          <Field label="Next charge" type="date" value={row.nextChargeDate ?? ""} onSave={(v) => v && save({ nextChargeDate: v })} />
          <Field label="Category" value={row.category ?? ""} onSave={(v) => save({ category: v })} />
          <Field label="Note" value={row.note ?? ""} onSave={(v) => save({ note: v })} />
        </div>

        <section className="lx-kit">
          <div className="lx-perf" aria-hidden />
          <h3 className="lx-serif">Cancel kit</h3>
          {kit ? (
            <>
              <p className="lx-mono lx-dim">
                {kit.channel.replace("_", " ")} · {kit.language}
              </p>
              <Steps md={kit.stepsMd} />
              <div className="lx-message">
                {kit.messageSubject && <p className="lx-mono"><b>Subject:</b> {kit.messageSubject}</p>}
                <p className="lx-message__body">{kit.messageBody}</p>
              </div>
              <p className="lx-mono lx-dim lx-warn">
                Verify these steps on {row.merchant}&apos;s own site. Lapse never sends this; you do.
              </p>
              <div className="lx-actions">
                <button
                  type="button"
                  className="lx-btn lx-btn--ink"
                  onClick={async () => {
                    await navigator.clipboard.writeText(fullMessage);
                    toast.success("Message copied");
                  }}
                >
                  Copy message
                </button>
                <a className="lx-btn" href={mailto}>
                  Open in mail app
                </a>
                <button
                  type="button"
                  className="lx-btn lx-btn--void"
                  onClick={() => {
                    onLocalEdit(row.id);
                    mark.mutate({ id: row.id, status: "cancelled" } as any);
                    onClose();
                  }}
                >
                  Mark cancelled
                </button>
              </div>
            </>
          ) : (
            <p className="lx-mono lx-dim">No kit yet. Lapse writes the steps and message; you send it.</p>
          )}
          <div className="lx-draft">
            <select className="lx-input lx-mono" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <button type="button" className="lx-btn lx-btn--ember" onClick={draft}>
              {kit ? "Redraft cancel kit" : "Draft cancel kit"}
            </button>
          </div>
          <p className="lx-mono lx-dim">Amount: {money(row.amountMinor, row.currency)}</p>
        </section>
      </SheetContent>
    </Sheet>
  );
}
