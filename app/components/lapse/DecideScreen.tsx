import { IconCheck, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "./Avatar";
import { CADENCE_WORD, dueText, longDate, money, PER, type Sub, tipFor } from "./format";
import { LapseMark } from "./Logo";

const SWIPE = 110;
const LEAVE_MS = 300;

function TopCard({
  row,
  flashed,
  leaving,
  onDecide,
}: {
  row: Sub;
  flashed: boolean;
  leaving: "keep" | "cancel" | null;
  onDecide: (s: "keep" | "cancel") => void;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const onUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (dx > SWIPE) onDecide("keep");
    else if (dx < -SWIPE) onDecide("cancel");
    setDx(0);
  };
  const drag = Math.max(-1, Math.min(1, dx / SWIPE));
  const hot = row.daysLeft !== null && row.daysLeft <= 3;
  const urgency = row.daysLeft === null ? 0 : Math.round((1 - Math.max(0, Math.min(30, row.daysLeft)) / 30) * 100);
  return (
    <article
      className={`lp-card lp-card--top${leaving ? ` is-leaving-${leaving}` : ""}${flashed ? " is-agent" : ""}`}
      style={dx && !leaving ? { transform: `translateX(${dx}px) rotate(${dx / 18}deg)`, transition: "none" } : undefined}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        start.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label={`${row.merchant}, ${money(row.amountMinor, row.currency)}${PER[row.cadence]}, ${dueText(row.daysLeft)}`}
    >
      <span className="lp-card__stamp lp-card__stamp--keep" style={{ opacity: Math.max(0, drag) }} aria-hidden>
        KEEP
      </span>
      <span className="lp-card__stamp lp-card__stamp--cancel" style={{ opacity: Math.max(0, -drag) }} aria-hidden>
        CANCEL
      </span>
      <div className="lp-card__head">
        <Avatar name={row.merchant} size={44} />
        <div className="lp-card__id">
          <h2 className="lp-card__name">{row.merchant}</h2>
          <span className="lp-card__sub">
            {CADENCE_WORD[row.cadence]} · {row.kind === "trial" ? "Free trial" : "Subscription"}
          </span>
        </div>
      </div>
      {(flashed || row.status === "unsure") && (
        <div className="lp-card__tags">
          {row.status === "unsure" && <span className="lp-tag lp-tag--unsure">Check this one</span>}
          {flashed && <span className="lp-tag lp-tag--agent">Updated by Lapse</span>}
        </div>
      )}
      <p className="lp-card__amount">
        <span className="lp-num">{money(row.amountMinor, row.currency)}</span>
        <span className="lp-per">{PER[row.cadence]}</span>
      </p>
      <div className={`lp-due${hot ? " is-hot" : ""}`}>
        <div className="lp-due__row">
          <b>{dueText(row.daysLeft)}</b>
          <span>{longDate(row.nextChargeDate)}</span>
        </div>
        <span className="lp-due__bar">
          <i style={{ width: `${urgency}%` }} />
        </span>
      </div>
      <p className="lp-card__tip">
        <LapseMark size={14} />
        <span>{tipFor(row)}</span>
      </p>
    </article>
  );
}

export function DecideScreen({
  queue,
  total,
  flashed,
  onDecide,
  onSkip,
  onAsk,
  onDone,
}: {
  queue: Sub[];
  total: number;
  flashed: Set<string>;
  onDecide: (row: Sub, s: "keep" | "cancel") => void;
  onSkip: (row: Sub) => void;
  onAsk: (row: Sub) => void;
  onDone: () => void;
}) {
  const [leaving, setLeaving] = useState<{ id: string; dir: "keep" | "cancel" } | null>(null);
  const top = queue[0];

  const decide = (s: "keep" | "cancel") => {
    if (!top || leaving) return;
    setLeaving({ id: top.id, dir: s });
    setTimeout(() => {
      onDecide(top, s);
      setLeaving(null);
    }, LEAVE_MS);
  };

  const decideRef = useRef(decide);
  decideRef.current = decide;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") decideRef.current("keep");
      if (e.key === "ArrowLeft") decideRef.current("cancel");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!top) {
    return (
      <section className="lp-empty lp-enter">
        <h1 className="lp-h1">All decided.</h1>
        <p className="lp-lede">Every subscription has a decision.</p>
        <button type="button" className="lp-btn lp-btn--primary lp-btn--block" onClick={onDone}>
          See what you'll save
        </button>
      </section>
    );
  }

  const decided = Math.max(0, total - queue.length);
  return (
    <section className="lp-decide">
      <div className="lp-progress">
        <span>
          <b>{decided + 1}</b> of {total}
        </span>
        <span className="lp-progress__bar" aria-hidden>
          <span style={{ width: `${total ? (decided / total) * 100 : 0}%` }} />
        </span>
      </div>
      <div className="lp-stack">
        {queue[2] && <div className="lp-card lp-card--ghost lp-card--g2" aria-hidden />}
        {queue[1] && <div className="lp-card lp-card--ghost lp-card--g1" aria-hidden />}
        <TopCard
          key={top.id}
          row={top}
          flashed={flashed.has(top.id)}
          leaving={leaving?.id === top.id ? leaving.dir : null}
          onDecide={decide}
        />
      </div>
      <div className="lp-choices">
        <button type="button" className="lp-btn lp-btn--cancel" onClick={() => decide("cancel")}>
          <IconX size={18} stroke={2.4} /> Cancel
        </button>
        <button type="button" className="lp-btn lp-btn--keep" onClick={() => decide("keep")}>
          <IconCheck size={18} stroke={2.4} /> Keep
        </button>
      </div>
      <div className="lp-minor">
        <button type="button" className="lp-link" onClick={() => onAsk(top)}>
          Not sure? Ask Lapse
        </button>
        {queue.length > 1 && (
          <button type="button" className="lp-link" onClick={() => onSkip(top)}>
            Skip for now
          </button>
        )}
      </div>
      <p className="lp-hint">Swipe, or use ← →</p>
    </section>
  );
}
