import { useActionMutation } from "@agent-native/core/client/hooks";
import { IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const PLACEHOLDER = `Paste anything, for example:

03 Oct 2026   NETFLIX.COM        ₦7,000.00
10 Oct 2026   SPOTIFY P1         $11.99

or a whole email:
"Your free trial of Canva Pro ends on 4 Nov…"`;

export function AddScreen({
  hasRows,
  sampleBusy,
  onSample,
  onBulk,
  onAdded,
}: {
  hasRows: boolean;
  sampleBusy: boolean;
  onSample: () => void;
  onBulk: () => void;
  onAdded: () => void;
}) {
  const [text, setText] = useState("");
  const [miss, setMiss] = useState<string[] | null>(null);
  const add = useActionMutation("add-charges");
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async () => {
    setMiss(null);
    onBulk();
    try {
      const r: any = await add.mutateAsync({ text, kind: "auto" } as any);
      if (!r?.found) {
        setMiss(
          r?.format === "email"
            ? r.skipped?.length
              ? r.skipped.slice(0, 3)
              : ["No subscription, renewal or free-trial wording in it."]
            : [
                "Each statement line needs a date, a description and an amount.",
                "Lapse looks for charges that repeat, so include a few months if you can.",
              ],
        );
        return;
      }
      toast.success(`Found ${r.found} subscription${r.found === 1 ? "" : "s"}.`);
      setText("");
      onAdded();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't read that");
    }
  };

  const lines = text.split("\n").filter((l) => l.trim()).length;

  return (
    <section className="lp-add lp-enter">
      <h1 className="lp-h1">{hasRows ? "Add more charges" : "What's about to charge you?"}</h1>
      <p className="lp-lede">
        Paste your bank statement or your subscription emails. Lapse finds every subscription and free trial in it.
      </p>
      <div className="lp-paste">
        <textarea
          className="lp-paste__box"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          aria-label="Bank statement or subscription emails"
          spellCheck={false}
        />
        <div className="lp-paste__bar">
          <button type="button" className="lp-link" onClick={() => fileRef.current?.click()}>
            <IconUpload size={14} stroke={1.8} /> Upload a CSV
          </button>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setText(await f.text());
              e.target.value = "";
            }}
          />
          <span>{lines ? `${lines} line${lines === 1 ? "" : "s"}` : ""}</span>
        </div>
      </div>
      {miss && (
        <div className="lp-miss" role="status">
          <b>No subscriptions found in that.</b>
          <ul>
            {miss.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <span>Tip: paste the whole email, including the From: line.</span>
        </div>
      )}
      <button type="button" className="lp-btn lp-btn--primary lp-btn--block" disabled={!text.trim() || add.isPending} onClick={run}>
        {add.isPending ? "Reading…" : "Find my subscriptions"}
      </button>
      {!hasRows && (
        <button type="button" className="lp-btn lp-btn--ghost lp-btn--block" onClick={onSample} disabled={sampleBusy}>
          {sampleBusy ? "Loading the sample…" : "No statement handy? Try sample data"}
        </button>
      )}
    </section>
  );
}
