import { useActionMutation } from "@agent-native/core/client/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

const TABS = [
  { id: "statement", label: "Paste statement" },
  { id: "csv", label: "Upload CSV" },
  { id: "email", label: "Paste emails" },
  { id: "sample", label: "Load sample" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function ImportSheet({
  open,
  onOpenChange,
  onLocalBulk,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onLocalBulk: () => void;
}) {
  const [tab, setTab] = useState<Tab>("statement");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const importStatement = useActionMutation("import-statement");
  const detect = useActionMutation("detect-recurring");
  const loadSample = useActionMutation("load-sample-data");
  const busy = importStatement.isPending || detect.isPending || loadSample.isPending;

  const run = async () => {
    onLocalBulk();
    try {
      if (tab === "sample") {
        const r: any = await loadSample.mutateAsync({} as any);
        toast.success(`Sample loaded: ${r.inserted} new, ${r.updated} refreshed. Illustrative amounts.`);
      } else {
        if (!text.trim()) return;
        const imp: any = await importStatement.mutateAsync({ text, kind: tab } as any);
        const det: any = await detect.mutateAsync({ importId: imp.importId } as any);
        toast.success(`Found ${det.inserted + det.updated} recurring charges.`);
        setText("");
        setFileName(null);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="lx-sheet">
        <SheetTitle className="lx-serif lx-sheet__title">Import</SheetTitle>
        <SheetDescription className="lx-mono lx-dim">
          Parsed on your server with fixed rules. Nothing is sent anywhere.
        </SheetDescription>
        <div className="lx-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              className={`lx-tab${tab === t.id ? " is-on" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "csv" && (
          <label className="lx-file">
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFileName(f.name);
                setText(await f.text());
              }}
            />
            <span className="lx-mono">{fileName ?? "Choose a CSV file (date, description, amount, currency)"}</span>
          </label>
        )}
        {(tab === "statement" || tab === "email" || (tab === "csv" && text)) && (
          <textarea
            className="lx-textarea lx-mono"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              tab === "email"
                ? "Paste billing / trial emails…"
                : tab === "csv"
                  ? ""
                  : "03/10/2026  NFLX*DIGITAL LAGOS  NGN 7,000.00"
            }
            rows={12}
          />
        )}
        {tab === "sample" && (
          <p className="lx-mono lx-sample-copy">
            Fictional statement and emails across NGN, GBP, USD, EUR, KES and INR, with dates set
            near today. Sample data – illustrative amounts.
          </p>
        )}
        <button type="button" className="lx-btn lx-btn--ink lx-btn--wide" onClick={run} disabled={busy}>
          {busy ? "Reading…" : tab === "sample" ? "Load sample data" : "Import"}
        </button>
      </SheetContent>
    </Sheet>
  );
}
