import { IconCheck, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { dueText, longDate, money, PER, type Sub, tipFor } from "./format";

const SWIPE = 110;
const LEAVE_MS = 300;

function Countdown({ days }: { days: number | null }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const left = days === null ? 30 : Math.max(0, Math.min(30, days));
  const hot = days !== null && days <= 3;
  return (
    <div className={`lp-ring${hot ? " is-hot" : ""}`}>
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle className="lp-ring__track" cx="32" cy="32" r={r} />
        <circle
          className="lp-ring__fill"
          cx="32"
          cy="32"
          r={r}
          style={{ strokeDasharray: c, strokeDashoffset: c * (1 - left / 30), "--c": c } as React.CSSProperties}
        />
      </svg>
      <span className="lp-ring__n">{days === null ? "?" : Math.max(days, 0)}</span>
      <span className="lp-ring__u">{days === 1 ? "day" : "days"}</span>
    </div>
  );
}

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
      <div className="lp-card__tags">
        {row.kind === "trial" && <span className="lp-tag lp-tag--trial">Free trial</span>}
        {row.status === "unsure" && <span className="lp-tag lp-tag--unsure">Check this one</span>}
        {flashed && <span className="lp-tag lp-tag--agent">Lapse just updated this</span>}
      </div>
      <h2 className="lp-card__name">{row.merchant}</h2>
      <p className="lp-card__price">
        <span className="lp-num">{money(row.amountMinor, row.currency)}</span>
        <span className="lp-per">{PER[row.cadence]}</span>
      </p>
      <div className="lp-card__when">
        <Countdown days={row.daysLeft} />
        <div>
          <b>{dueText(row.daysLeft)}</b>
          <span>{longDate(row.nextChargeDate)}</span>
        </div>
      </div>
      <p className="lp-card__tip">
        <span>Lapse says</span>
        {tipFor(row)}
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
          <b>{queue.length}</b> left to decide
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
          <IconX size={20} stroke={2.6} /> Cancel it
        </button>
        <button type="button" className="lp-btn lp-btn--keep" onClick={() => decide("keep")}>
          <IconCheck size={20} stroke={2.6} /> Keep
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
      <p className="lp-hint">Swipe right to keep, left to cancel. Arrow keys work too.</p>
    </section>
  );
}
