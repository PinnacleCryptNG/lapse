import { appPath } from "@agent-native/core/client/api-path";
import { IconArrowRight, IconClipboardText, IconMailForward } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/lapse/Avatar";
import { LapseLogo, LapseMark } from "@/components/lapse/Logo";
import { useTicker } from "@/components/lapse/useTicker";
import { leaveDemoAndSignIn, startDemo, whoIsVisiting, type Visitor } from "@/lib/demo";

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

type Hit = { name: string; tag: string; v: "keep" | "cancel"; yearly: number };
const LINES: { d: string; t: string; a: number; hit?: Hit }[] = [
  { d: "02 Oct", t: "GROCERY MART #214", a: -23.4 },
  { d: "03 Oct", t: "NETFLIX.COM", a: -15.49, hit: { name: "Netflix", tag: "every month", v: "keep", yearly: 0 } },
  { d: "04 Oct", t: "TRANSFER FROM ADA", a: 200 },
  { d: "06 Oct", t: "FOCUSFLOW* TRIAL", a: 0, hit: { name: "FocusFlow Pro", tag: "trial ends in 3 days", v: "cancel", yearly: 39.99 } },
  { d: "08 Oct", t: "UBER *TRIP", a: -6.2 },
  { d: "09 Oct", t: "CANVA* 104-2219", a: -15, hit: { name: "Canva", tag: "price up 16%", v: "cancel", yearly: 180 } },
  { d: "11 Oct", t: "CAFE NERO", a: -4.5 },
  { d: "12 Oct", t: "APPLE.COM/BILL", a: -2.99, hit: { name: "iCloud", tag: "every month", v: "cancel", yearly: 35.88 } },
];
const HITS = LINES.map((l, i) => (l.hit ? i : -1)).filter((i) => i >= 0);
const TICK_MS = 480;
const SCAN_END = LINES.length;
const DECIDE_AT = SCAN_END + 2;
const LOOP = DECIDE_AT + HITS.length + 8;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (n: number) => (n > 0 ? `+${usd(n)}` : n < 0 ? `−${usd(-n)}` : usd(0));

function Scan() {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(LOOP - 1);
      return;
    }
    const id = setInterval(() => setT((n) => (n + 1) % LOOP), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const decided = (i: number) => t >= DECIDE_AT + HITS.indexOf(i);
  const saved = HITS.filter(decided).reduce((s, i) => s + LINES[i]!.hit!.yearly, 0);
  const shown = useTicker(Math.round(saved * 100), 700) / 100;
  const scanning = t < SCAN_END;
  const bubble = scanning
    ? "Reading your statement…"
    : t < DECIDE_AT
      ? `Found ${HITS.length} repeat charges. 3 look forgotten.`
      : t < DECIDE_AT + HITS.length
        ? "Cancel the ones you don't use?"
        : "Done. Cancel messages are ready.";
  return (
    <div className="ld-scan" aria-hidden>
      <div className={`ld-st${t === 0 ? " is-reset" : ""}`}>
        <div className="ld-st__head">
          <b>Statement</b>
          <span className={`ld-st__pill${scanning ? " is-live" : ""}`}>{scanning ? "Scanning" : `${HITS.length} repeat charges`}</span>
        </div>
        <ol className="ld-st__rows">
          {LINES.map((l, i) => {
            const found = l.hit && (t > i || !scanning);
            const done = l.hit && decided(i);
            return (
              <li
                key={l.t}
                className={`ld-st__row${l.hit ? " is-hit" : ""}${scanning && t === i ? " is-scan" : ""}${found ? " is-found" : ""}${done ? ` is-${l.hit!.v}` : ""}`}
              >
                <span className="ld-st__d">{l.d}</span>
                <span className="ld-st__t">
                  <span className="ld-st__desc">{l.t}</span>
                  {l.hit && (
                    <span className="ld-st__tag">
                      <Avatar name={l.hit.name} size={16} />
                      {l.hit.name} · {l.hit.tag}
                    </span>
                  )}
                </span>
                <span className="ld-st__a">{signed(l.a)}</span>
                {l.hit && <span className={`ld-st__stamp ld-st__stamp--${l.hit.v}`}>{l.hit.v === "keep" ? "KEEP" : "CANCEL"}</span>}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="ld-bubble" key={bubble}>
        {bubble}
      </div>
      <div className="ld-saved">
        <LapseMark size={16} />
        <span>
          Saved <b>{usd(shown)}</b>/yr
        </span>
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

function NavLink() {
  const [who, setWho] = useState<Visitor>("guest");
  useEffect(() => {
    void whoIsVisiting().then(setWho);
  }, []);
  if (who === "member") {
    return (
      <a className="ld-link" href={appPath("/ledger")}>
        Open my list
      </a>
    );
  }
  return (
    <a
      className="ld-link"
      href={appPath("/ledger")}
      onClick={(e) => {
        e.preventDefault();
        void whoIsVisiting().then((now) =>
          now === "demo" ? leaveDemoAndSignIn() : window.location.assign(appPath("/ledger")),
        );
      }}
    >
      Sign in
    </a>
  );
}

export default function Landing() {
  const ref = useReveal();
  return (
    <div className="ld" ref={ref}>
      <div className="ld-glow" aria-hidden />
      <header className="ld-nav">
        <LapseLogo size={17} />
        <NavLink />
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
          <Scan />
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
