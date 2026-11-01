# Lapse

**Never pay for something you forgot you had.**

Lapse finds subscriptions and free trials that are about to charge you and helps
you cancel them, in three screens:

1. **Add charges**: paste a bank statement, a CSV or subscription emails (or try the sample).
2. **Keep or cancel**: one card per subscription, soonest charge first. Tap or swipe.
3. **Cancel & save**: what you'll save a year, with a cancel message ready to send for each one.

You and the Lapse agent work on the same live cards: ask it to "go through them with me"
and its decisions and messages appear on your screen straight away.

Lapse never sends emails, submits forms or contacts any service. Cancelling
produces a **draft kit**: steps and a short message in your language. You copy
the message and send it yourself.

**Try it:** open https://lapse-agent.vercel.app and tap **Try the demo, no
sign-up**. It creates a private throwaway account and loads the sample
statement. A three-step guide on the ledger walks you through add → check →
cancel.

Built for the Builder.io Agent-Native Hackathon with
[`@agent-native/core`](https://www.agent-native.com/docs/).

## How it works

1. **Import.** Paste a bank statement, upload a CSV, paste billing or trial
   emails, or load the sample. The parsers in `server/lib/parse.ts` are
   deterministic (no LLM). They read dates like `DD/MM/YYYY`, `YYYY-MM-DD`,
   `3 Oct 2026` and amounts in NGN, GBP, USD, EUR, INR, KES, ZAR and BRL, or
   with the symbols `₦ £ $ € ₹ KSh R R$`.
2. **Detect.** Charges are grouped by normalised merchant. The cadence comes
   from the median gap between charges. Confidence comes from how many charges
   there are and how regular the gaps are. The same merchant billed in two
   currencies is flagged as a possible duplicate, and a rise of more than 5% is
   flagged as a price increase.
3. **Decide together.** Rows under 60% confidence are marked `unsure` with a
   one-line question. The agent never overrides a row you decided.
4. **Cancel.** The agent drafts the steps and message (English, French,
   Portuguese, Spanish, Hausa, Yoruba or Nigerian Pidgin). You verify the steps
   on the service's own site, send the message, then tap **Mark cancelled**. The
   Saved / year counter adds it up, one total per currency.

## Actions

Every capability is a `defineAction()` in `actions/`. The UI, the in-app agent
and external MCP clients all call the same actions.

| Action | Method | MCP | What it does |
| --- | --- | --- | --- |
| `add-charges` | POST | no | Detect the format of pasted statement, CSV or email text, parse it, and add recurring rows (cadence, next charge, confidence, flags) |
| `list-subscriptions` | GET | yes | Rows filtered by status, days ahead or currency, sorted by next charge |
| `upcoming-renewals` | GET | yes | Charges in the next N days (default 7) plus totals per currency |
| `update-subscription` | POST | yes | Edit a row as `user` or `agent`; agents cannot change a user's decision |
| `mark-status` | POST | yes | Stamp keep / cancel / unsure / cancelled and return the savings |
| `draft-cancellation` | POST | yes | Save a cancellation kit the agent has written. Never sends anything |
| `get-cancel-kit` | GET | yes | Read the latest kit for a row |
| `savings-summary` | GET | yes | Yearly savings from cancelled rows, per currency |
| `view-screen` | — | — | What the user is looking at: the screen and the card on top |
| `load-sample-data` | POST | no | Seed the fictional sample (idempotent) |

## Run locally

Requires Node 22.22 or newer.

```bash
corepack enable
pnpm install
cp .env.example .env   # or create .env with the lines below
# DATABASE_URL=pglite:./data/pglite
# ANTHROPIC_API_KEY=...            (or OPENAI_API_KEY / OPENROUTER_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY)
pnpm dev
```

Open http://localhost:8080, choose **Continue as local dev**, go to **Ledger**
and load the sample data.

```bash
pnpm typecheck && pnpm test && pnpm build
```

## Connect Claude Code over MCP

The app mounts a remote MCP server at `/mcp` and a fetchable catalog at
`/.well-known/mcp.json`.

**OAuth (recommended).** Add the server, then run `/mcp` in Claude Code and
choose **Authenticate**:

```bash
claude mcp add --transport http lapse https://<your-app>/mcp
```

**Per-user token.** For clients that can't run OAuth, sign in to Lapse, open
`https://<your-app>/mcp/connect`, choose **Generate a static token → Create
connection token**, then:

```bash
claude mcp add --transport http lapse https://<your-app>/mcp \
  --header "Authorization: Bearer <connection-token>"
```

The deployment-wide `ACCESS_TOKEN` also authenticates `/mcp`, but it carries no
user, so Lapse's owner-scoped actions answer "Sign in first". Use OAuth or a
connection token for real data.

Then ask: *"What renews this week?"* and Claude Code calls `upcoming-renewals`.

## Deploy (Vercel + Neon)

```bash
# Production env: DATABASE_URL (Neon pooled), BETTER_AUTH_SECRET, ANTHROPIC_API_KEY, ACCESS_TOKEN, CRON_SECRET
pnpm migrate:production
# Vercel Hobby allows one cron run a day, so slow the framework's job sweep down:
AGENT_NATIVE_VERCEL_CRON_SCHEDULE="0 9 * * *" NITRO_PRESET=vercel pnpm build
npx vercel deploy --prebuilt --prod
```

## Privacy

Whatever you paste or upload is stored only in your own database, scoped to
your account. Nothing goes to third parties except your LLM provider, and only
when you chat with the agent. Lapse never sends or cancels anything for you.
Sample data is fictional, with illustrative amounts.

## Credits

Built from the Agent-Native chat template on or after 27 Oct 2026. New for
Lapse: everything in `actions/`, `server/lib/`, `server/db/`, `app/routes/`,
`app/components/lapse/` and the three-screen design.
