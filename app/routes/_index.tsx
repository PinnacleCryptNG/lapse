import { appPath } from "@agent-native/core/client/api-path";
import { IconArrowRight, IconCheck, IconClipboardText, IconMailForward, IconX } from "@tabler/icons-react";
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

const SCENES = ["Paste", "Decide", "Save"] as const;
const SCENE_MS = 4200;

const LINES = ["03 Oct  NETFLIX.COM      ₦7,000", "05 Oct  SPOTIFY P1       ₦1,900", "07 Oct  SHOPRITE IKEJA  ₦23,450", "09 Oct  APPLE.COM/BILL   ₦1,500"];
const CARDS = [
  { name: "FocusFlow Pro", amt: "₦45,000", per: "/year", due: "Trial ends in 3 days", tip: "Free trial. It turns paid on Friday.", verdict: "cancel" },
  { name: "Netflix", amt: "₦7,000", per: "/month", due: "Charges in 2 days", tip: "You pay this every month.", verdict: "keep" },
  { name: "iCloud+", amt: "₦1,500", per: "/month", due: "Charges tomorrow", tip: "Easy to forget. Still using it?", verdict: "cancel" },
];

function Counter() {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGo(true), 350);
    return () => clearTimeout(t);
  }, []);
  const n = useTicker(go ? 6300000 : 0, 1400);
  return <span className="ld-count">₦{Math.round(n / 100).toLocaleString("en-US")}</span>;
}

function Phone() {
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS);
    return () => clearTimeout(t);
  }, [scene, paused]);
  return (
    <div className="ld-stage">
      <div className="ld-phone" aria-hidden>
        <div className="ld-phone__top">
          <LapseLogo size={13} />
          <span className="ld-phone__tabs">
            {SCENES.map((s, i) => (
              <i key={s} className={i === scene ? "is-on" : i < scene ? "is-done" : undefined} />
            ))}
          </span>
        </div>
        <div className="ld-screen" key={scene} data-scene={SCENES[scene]}>
          {scene === 0 && (
            <div className="ld-s ld-s--paste">
              <b>What&apos;s about to charge you?</b>
              <div className="ld-paste">
                {LINES.map((l, i) => (
                  <code key={l} style={{ "--d": `${i * 380}ms` } as React.CSSProperties}>
                    {l}
                  </code>
                ))}
                <span className="ld-caret" />
              </div>
              <span className="ld-found">
                <IconCheck size={14} stroke={2.6} /> Found 3 subscriptions
              </span>
            </div>
          )}
          {scene === 1 && (
            <div className="ld-s ld-s--decide">
              {CARDS.map((c, i) => (
                <div key={c.name} className={`ld-card ld-card--${i} ld-card--${c.verdict}`}>
                  <span className={`ld-stamp ld-stamp--${c.verdict}`}>{c.verdict === "keep" ? "KEEP" : "CANCEL"}</span>
                  <span className="ld-card__row">
                    <span className="ld-av">{c.name[0]}</span>
                    <span>
                      <b>{c.name}</b>
                      <small>{c.due}</small>
                    </span>
                  </span>
                  <span className="ld-card__amt">
                    {c.amt}
                    <small>{c.per}</small>
                  </span>
                  <span className="ld-card__tip">
                    <LapseMark size={12} /> {c.tip}
                  </span>
                </div>
              ))}
              <div className="ld-choices">
                <span className="ld-x">
                  <IconX size={14} stroke={2.6} /> Cancel
                </span>
                <span className="ld-v">
                  <IconCheck size={14} stroke={2.6} /> Keep
                </span>
              </div>
            </div>
          )}
          {scene === 2 && (
            <div className="ld-s ld-s--save">
              <small>You&apos;ll save each year</small>
              <Counter />
              {[
                ["FocusFlow Pro", "Message ready"],
                ["iCloud+", "Cancelled"],
              ].map(([n, s], i) => (
                <span key={n} className="ld-row" style={{ "--d": `${500 + i * 350}ms` } as React.CSSProperties}>
                  <span className="ld-av">{n![0]}</span>
                  <b>{n}</b>
                  <em className={s === "Cancelled" ? "is-done" : undefined}>{s}</em>
                </span>
              ))}
              <span className="ld-note" style={{ "--d": "1300ms" } as React.CSSProperties}>
                <IconMailForward size={14} stroke={2} /> Lapse wrote the message. You send it.
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="ld-scenes" role="tablist" aria-label="How Lapse works">
        {SCENES.map((s, i) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={i === scene}
            className={i === scene ? "is-on" : undefined}
            onClick={() => {
              setScene(i);
              setPaused(true);
            }}
          >
            <span>{i + 1}</span>
            {s}
            {i === scene && !paused && <i style={{ animationDuration: `${SCENE_MS}ms` }} />}
          </button>
        ))}
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
          <Phone />
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
