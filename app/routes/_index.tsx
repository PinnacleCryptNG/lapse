import { appPath } from "@agent-native/core/client/api-path";
import { IconArrowRight, IconBrandGithub, IconLock, IconMailForward, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";

import { LapseLogo, LapseMark } from "@/components/lapse/Logo";
import { startDemo } from "@/lib/demo";

const SITE = "https://lapse-agent.vercel.app";
const TITLE = "Lapse · Never pay for something you forgot you had";
const DESC =
  "Paste a bank statement or your subscription emails. Lapse finds what's about to charge you, you decide keep or cancel, and it writes the cancel message for you to send.";

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

function DemoButton({ children, className }: { children: React.ReactNode; className: string }) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  return (
    <>
      <button
        type="button"
        className={className}
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
        {state === "busy" ? "Opening your demo…" : children}
      </button>
      {state === "error" && (
        <p className="ld-err" role="alert">
          Couldn&apos;t open the demo. Try again in a minute.
        </p>
      )}
    </>
  );
}

const HERO_CARDS = [
  { name: "Netflix", price: "₦7,000", per: "/month", due: "Charges in 2 days", days: 2, verdict: "cancel" },
  { name: "FocusFlow Pro", price: "$59.99", per: "/year", due: "Free trial ends in 3 days", days: 3, verdict: "cancel", trial: true },
  { name: "iCloud+", price: "₦1,500", per: "/month", due: "Charges tomorrow", days: 1, verdict: "keep" },
];

function HeroDeck() {
  return (
    <div className="ld-deck" aria-hidden>
      {HERO_CARDS.map((c, i) => (
        <div key={c.name} className={`ld-card ld-card--${i} ld-card--${c.verdict}`}>
          <span className={`ld-card__stamp ld-card__stamp--${c.verdict}`}>{c.verdict === "keep" ? "KEEP" : "CANCEL"}</span>
          {c.trial ? <span className="ld-chip">Free trial</span> : <span className="ld-chip ld-chip--ghost">Subscription</span>}
          <b className="ld-card__name">{c.name}</b>
          <span className="ld-card__price">
            {c.price}
            <small>{c.per}</small>
          </span>
          <span className="ld-card__due">
            <i style={{ "--p": `${(1 - c.days / 30) * 100}%` } as React.CSSProperties} />
            {c.due}
          </span>
        </div>
      ))}
      <div className="ld-bubble">
        <LapseMark size={18} />
        <span>That trial turns paid on Friday. Cancel it?</span>
      </div>
    </div>
  );
}

const STEPS = [
  { n: "01", title: "Paste", body: "Drop in your bank statement, a CSV, or the receipts in your inbox. No bank login." },
  { n: "02", title: "Decide", body: "One card at a time, soonest charge first. Keep it or cancel it." },
  { n: "03", title: "Save", body: "Lapse writes the cancel message. You check it and send it yourself." },
];

export default function Landing() {
  return (
    <div className="ld">
      <header className="ld-nav">
        <LapseLogo size={24} />
        <a className="ld-nav__link" href={appPath("/ledger")}>
          Open Lapse
        </a>
      </header>

      <section className="ld-hero">
        <div className="ld-hero__copy">
          <p className="ld-kicker">
            <span className="ld-pulse" /> Your subscriptions, checked in two minutes
          </p>
          <h1 className="ld-title">
            Never pay for something you <em>forgot</em> you had.
          </h1>
          <p className="ld-sub">
            Paste a bank statement or your subscription emails. Lapse finds every subscription and free trial that&apos;s about to
            charge you. You decide what stays.
          </p>
          <div className="ld-ctas">
            <DemoButton className="ld-btn ld-btn--primary">
              Try it with sample data <IconArrowRight size={18} stroke={2.2} />
            </DemoButton>
            <a className="ld-btn ld-btn--quiet" href={appPath("/ledger?s=add")}>
              Use my own statement
            </a>
          </div>
          <p className="ld-fine">Free · no sign-up for the demo · nothing is ever sent for you</p>
        </div>
        <HeroDeck />
      </section>

      <section className="ld-steps" aria-label="How it works">
        {STEPS.map((s) => (
          <article key={s.n} className="ld-step">
            <span className="ld-step__n">{s.n}</span>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </article>
        ))}
      </section>

      <section className="ld-duo">
        <div>
          <h2 className="ld-h2">You and the AI, on the same list.</h2>
          <p>
            Ask Lapse to go through your charges with you. It flags the duplicates, the price rises and the trials about to turn
            paid, one question at a time. Every change it makes lands on your cards live, and it can never overrule a decision
            you made.
          </p>
        </div>
        <ul className="ld-points">
          <li>
            <IconSparkles size={20} stroke={1.8} />
            <span>
              <b>Catches what you&apos;d miss.</b> Spotify billed in two currencies, a gym app you tried once, Canva up 15%.
            </span>
          </li>
          <li>
            <IconMailForward size={20} stroke={1.8} />
            <span>
              <b>Writes the cancel message.</b> Steps and a polite note in English, French, Pidgin, Yoruba, Hausa and more.
            </span>
          </li>
          <li>
            <IconLock size={20} stroke={1.8} />
            <span>
              <b>Never acts for you.</b> Lapse doesn&apos;t send, submit or cancel anything. Your list is private to your account.
            </span>
          </li>
        </ul>
      </section>

      <section className="ld-final">
        <h2 className="ld-h2">What&apos;s about to charge you?</h2>
        <DemoButton className="ld-btn ld-btn--primary">
          Find out with sample data <IconArrowRight size={18} stroke={2.2} />
        </DemoButton>
      </section>

      <footer className="ld-foot">
        <LapseLogo size={18} />
        <span>Built on Agent-Native for the Builder.io hackathon.</span>
        <a href="https://github.com/PinnacleCryptNG/lapse" target="_blank" rel="noreferrer">
          <IconBrandGithub size={16} stroke={1.8} /> Source
        </a>
      </footer>
    </div>
  );
}
