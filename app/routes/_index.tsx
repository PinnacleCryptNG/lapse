import { appPath } from "@agent-native/core/client/api-path";
import { IconArrowRight, IconClipboardText, IconMailForward } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { LapseLogo, LapseMark } from "@/components/lapse/Logo";
import { useTicker } from "@/components/lapse/useTicker";
import { startDemo } from "@/lib/demo";

const SITE = "https://lapse-agent.vercel.app";
const TITLE = "Lapse · Never pay for something you forgot you had";
const DESC = "Lapse finds the subscriptions and free trials about to charge you, and helps you cancel them.";

export function meta() {
  return [
    { title: TITLE },
    { name: "description", content: DESC },
    { property: "og:type", content: "website" },
    { property: "og:url", content: SITE },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESC },
    { property: "og:image", content: `${SITE}/og.png` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: TITLE },
    { name: "twitter:description", content: DESC },
    { name: "twitter:image", content: `${SITE}/og.png` },
  ];
}

function DemoButton({ label = "Try the demo" }: { label?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  return (
    <span className="ld-demo">
      <button
        type="button"
        className="ld-btn ld-btn--primary"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            await startDemo();
          } catch {
            setState("error");
          }
        }}
      >
        {state === "busy" ? "Opening…" : label}
        {state !== "busy" && <IconArrowRight size={16} stroke={2.2} />}
      </button>
      {state === "error" && (
        <span className="ld-err" role="alert">
          Couldn&apos;t open the demo. Try again.
        </span>
      )}
    </span>
  );
}

const DECK = [
  { name: "FocusFlow Pro", amt: 39.99, per: "/year", yearly: 39.99, due: "Turns paid in 3 days", chip: "Free trial", verdict: "cancel" },
  { name: "Netflix", amt: 15.49, per: "/month", yearly: 0, due: "Charges in 2 days", chip: "Monthly", verdict: "keep" },
  { name: "iCloud+", amt: 2.99, per: "/month", yearly: 35.88, due: "Charges tomorrow", chip: "Monthly", verdict: "cancel" },
  { name: "Canva Pro", amt: 15, per: "/month", yearly: 180, due: "Price went up 16%", chip: "Price rise", verdict: "cancel" },
  { name: "Spotify", amt: 11.99, per: "/month", yearly: 0, due: "Charges in 5 days", chip: "Monthly", verdict: "keep" },
] as const;
const STEP_MS = 2600;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

function Receipt({ c, className, style }: { c: (typeof DECK)[number]; className: string; style?: React.CSSProperties }) {
  return (
    <div className={`ld-r ${className}`} style={style}>
      <span className={`ld-r__stamp ld-r__stamp--${c.verdict}`}>{c.verdict === "keep" ? "KEEP" : "CANCEL"}</span>
      <span className={`ld-r__chip${c.chip === "Free trial" || c.chip === "Price rise" ? " is-hot" : ""}`}>{c.chip}</span>
      <b className="ld-r__name">{c.name}</b>
      <span className="ld-r__amt">
        {usd(c.amt)}
        <small>{c.per}</small>
      </span>
      <span className="ld-r__tear" aria-hidden />
      <span className="ld-r__due">{c.due}</span>
    </div>
  );
}

function Deck() {
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const c = DECK[i % DECK.length]!;
      setSaved((s) => (i % DECK.length === 0 ? c.yearly : s + c.yearly));
      setI((n) => n + 1);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [i]);
  const shown = useTicker(saved, 900);
  const at = (k: number) => DECK[(i + k) % DECK.length]!;
  const prev = i > 0 ? DECK[(i - 1) % DECK.length]! : null;
  return (
    <div className="ld-deck" aria-hidden>
      <Receipt c={at(2)} className="ld-r--back2" key={`b2-${i}`} />
      <Receipt c={at(1)} className="ld-r--back1" key={`b1-${i}`} />
      <Receipt c={at(0)} className="ld-r--top" key={`t-${i}`} />
      {prev && <Receipt c={prev} className={`ld-r--out ld-r--out-${prev.verdict}`} key={`o-${i}`} />}
      <div className="ld-saved">
        <LapseMark size={16} />
        <span>
          Saved <b>{usd(Math.round(shown * 100) / 100)}</b>/yr
        </span>
      </div>
      <div className="ld-bubble" key={`q-${i}`}>
        {at(0).verdict === "cancel" ? `${at(0).name}: ${at(0).due.toLowerCase()}. Cancel it?` : `${at(0).name}: you use this. Keep it?`}
      </div>
    </div>
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.2 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

const FEATURES = [
  { icon: IconClipboardText, t: "Paste, don't connect", b: "A statement, a CSV or your receipts. No bank login." },
  { icon: LapseMark, t: "An AI that asks first", b: "It flags trials, price rises and forgotten yearly charges." },
  { icon: IconMailForward, t: "You stay in control", b: "Lapse writes the cancel message. Only you send it." },
];

const HEAD = "Never pay for something you forgot you had.".split(" ");

export default function Landing() {
  const ref = useReveal();
  return (
    <div className="ld" ref={ref}>
      <div className="ld-glow" aria-hidden />
      <header className="ld-nav">
        <LapseLogo size={17} />
        <a className="ld-link" href={appPath("/ledger")}>
          Sign in
        </a>
      </header>
      <main>
        <section className="ld-hero">
          <div className="ld-hero__copy">
            <h1 className="ld-title" aria-label={HEAD.join(" ")}>
              {HEAD.map((w, i) => (
                <span key={i} className={w === "forgot" ? "ld-w ld-w--hit" : "ld-w"} style={{ "--i": i } as React.CSSProperties} aria-hidden>
                  {w}{" "}
                </span>
              ))}
            </h1>
            <p className="ld-sub ld-in" style={{ "--i": 9 } as React.CSSProperties}>
              Lapse finds the subscriptions and free trials about to charge you, and helps you cancel them.
            </p>
            <div className="ld-ctas ld-in" style={{ "--i": 11 } as React.CSSProperties}>
              <DemoButton />
              <a className="ld-btn ld-btn--quiet" href={appPath("/ledger?s=add")}>
                Use my statement
              </a>
            </div>
          </div>
          <Deck />
        </section>

        <section className="ld-feats">
          {FEATURES.map((f, i) => (
            <article key={f.t} className="ld-feat" data-reveal style={{ "--i": i } as React.CSSProperties}>
              <span className="ld-feat__icon">
                <f.icon size={18} />
              </span>
              <b>{f.t}</b>
              <p>{f.b}</p>
            </article>
          ))}
        </section>

        <section className="ld-final" data-reveal>
          <h2>What&apos;s about to charge you?</h2>
          <DemoButton label="Find out in a minute" />
        </section>
      </main>
      <footer className="ld-foot">
        <span>Lapse never sends or cancels anything for you.</span>
        <a href="https://github.com/PinnacleCryptNG/lapse" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
