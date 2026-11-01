import { appPath } from "@agent-native/core/client/api-path";
import { IconArrowRight } from "@tabler/icons-react";
import { useState } from "react";

import { LapseLogo, LapseMark } from "@/components/lapse/Logo";
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

function DemoButton() {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  return (
    <>
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
        {state === "busy" ? "Opening…" : "Try the demo"}
        {state !== "busy" && <IconArrowRight size={16} stroke={2.2} />}
      </button>
      {state === "error" && (
        <p className="ld-err" role="alert">
          Couldn&apos;t open the demo. Try again.
        </p>
      )}
    </>
  );
}

const ROWS = [
  { name: "iCloud+", amt: "₦1,500", due: "Tomorrow" },
  { name: "Netflix", amt: "₦7,000", due: "In 2 days" },
  { name: "FocusFlow Pro", amt: "$59.99", due: "Trial ends Fri", hit: true },
  { name: "Spotify", amt: "£11.99", due: "In 5 days" },
];

function Preview() {
  return (
    <div className="ld-shot" aria-hidden>
      <div className="ld-shot__bar">
        <span>Due this week</span>
        <span className="ld-shot__total">4 charges</span>
      </div>
      <ul className="ld-shot__rows">
        {ROWS.map((r) => (
          <li key={r.name} className={r.hit ? "is-hit" : undefined}>
            <span className="ld-shot__av">{r.name[0]}</span>
            <span className="ld-shot__name">{r.name}</span>
            <span className="ld-shot__due">{r.due}</span>
            <span className="ld-shot__amt">{r.amt}</span>
            {r.hit && <span className="ld-shot__chip">Cancel</span>}
          </li>
        ))}
      </ul>
      <div className="ld-shot__agent">
        <LapseMark size={16} />
        <span>FocusFlow&apos;s trial turns paid on Friday. Cancel it?</span>
      </div>
    </div>
  );
}

const STEPS = [
  ["Paste", "A statement or a few receipts."],
  ["Decide", "Keep or cancel, one at a time."],
  ["Cancel", "Send the message Lapse writes."],
];

export default function Landing() {
  return (
    <div className="ld">
      <header className="ld-nav">
        <LapseLogo size={17} />
        <a className="ld-link" href={appPath("/ledger")}>
          Sign in
        </a>
      </header>
      <main>
        <section className="ld-hero">
          <h1 className="ld-title">Never pay for something you forgot you had.</h1>
          <p className="ld-sub">Lapse finds the subscriptions and free trials about to charge you, and helps you cancel them.</p>
          <div className="ld-ctas">
            <DemoButton />
            <a className="ld-btn ld-btn--quiet" href={appPath("/ledger?s=add")}>
              Use my statement
            </a>
          </div>
        </section>
        <Preview />
        <ol className="ld-steps">
          {STEPS.map(([t, b], i) => (
            <li key={t}>
              <span>{i + 1}</span>
              <b>{t}</b>
              <p>{b}</p>
            </li>
          ))}
        </ol>
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
