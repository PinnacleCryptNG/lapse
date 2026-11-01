import { IconCheck, IconX } from "@tabler/icons-react";

export type GuideStep = 1 | 2 | 3 | 4;

const STEPS = [
  { n: 1, title: "Add your charges", body: "Paste a bank statement, or use the sample." },
  { n: 2, title: "Let Lapse check them", body: "It flags what's about to charge you and asks about anything odd." },
  { n: 3, title: "Cancel what you don't need", body: "Stamp VOID, get a ready-to-send cancel message, mark it cancelled." },
] as const;

export function Guide({
  step,
  onSample,
  onImport,
  onAudit,
  onHide,
  busy,
}: {
  step: GuideStep;
  onSample: () => void;
  onImport: () => void;
  onAudit: () => void;
  onHide?: (() => void) | undefined;
  busy?: boolean | undefined;
}) {
  return (
    <section className={`lx-guide${step === 1 ? " is-hero" : ""}`} aria-label="How Lapse works">
      <div className="lx-guide__head">
        <span className="lx-mono lx-guide__kicker">{step === 4 ? "ALL DONE" : `STEP ${step} OF 3`}</span>
        {onHide && (
          <button type="button" className="lx-guide__x" onClick={onHide} aria-label="Hide the guide">
            <IconX size={14} stroke={2} />
          </button>
        )}
      </div>
      <ol className="lx-guide__steps">
        {STEPS.map((s) => {
          const state = step > s.n ? "done" : step === s.n ? "now" : "next";
          return (
            <li key={s.n} className={`lx-guide__step is-${state}`}>
              <span className="lx-guide__n lx-mono" aria-hidden>
                {state === "done" ? <IconCheck size={14} stroke={2.4} /> : s.n}
              </span>
              <span className="lx-guide__text">
                <span className="lx-guide__title">{s.title}</span>
                <span className="lx-guide__body lx-mono">{s.body}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="lx-guide__cta">
        {step === 1 && (
          <>
            <button type="button" className="lx-btn lx-btn--ember" onClick={onSample} disabled={busy}>
              {busy ? "Loading sample…" : "Try with sample data"}
            </button>
            <button type="button" className="lx-btn lx-btn--ink" onClick={onImport}>
              Paste my statement
            </button>
          </>
        )}
        {step === 2 && (
          <button type="button" className="lx-btn lx-btn--ember" onClick={onAudit}>
            Ask Lapse to check my list
          </button>
        )}
        {step === 3 && (
          <span className="lx-mono lx-guide__hint">
            Tap <b className="lx-guide__void">VOID</b> on a row you don't want, then open it for the cancel message.
          </span>
        )}
        {step === 4 && <span className="lx-mono lx-guide__hint">Your savings are in the Saved stub below.</span>}
      </div>
    </section>
  );
}
