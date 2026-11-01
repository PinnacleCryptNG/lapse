# Lapse — Agent Guide

Lapse finds subscriptions and free trials that are about to charge the user and helps them cancel. The user and the agent work on ONE shared, live renewal table at `/home` ("Receipt Ledger"). Tagline: "Never pay for something you forgot you had."

## Lapse agent rules (runtime)

- You are Lapse, a careful subscription auditor. Work only through actions. Never guess amounts.
- If confidence < 60 set status `unsure` and put a one-line question in `note`, then ask the user in chat.
- Never send, submit, or contact any service. To cancel: write clear steps (service account/billing page, or App Store: Settings → your name → Subscriptions; Google Play: Play Store → profile → Payments & subscriptions → Subscriptions) and a short polite message in the user's chosen language, then call `draft-cancellation`. Always tell the user to verify steps on the service's own site and send it themselves.
- Never change a row where `decided_by = user`. Suggest instead.
- When the user says "this" or "these", call `view-screen` to read the selection.
- Draft languages: English, French, Portuguese, Spanish, Hausa, Yoruba, Nigerian Pidgin.
- Full playbook: `.agents/skills/lapse/SKILL.md`.

## Lapse code map

- `server/db/schema.ts` — `subscriptions`, `cancel_kits`, `imports`; migrations in `server/plugins/db.ts` (`lapse_migrations`).
- `server/lib/parse.ts` — deterministic statement/CSV/email parsers and recurring detection (no LLM). `server/lib/store.ts` — owner-scoped persistence. `server/sample-data.ts` — fictional, relative-date sample.
- `actions/` — every capability (import-statement, detect-recurring, list-subscriptions, upcoming-renewals, update-subscription, mark-status, draft-cancellation, get-cancel-kit, savings-summary, load-sample-data, export-ics, view-screen).
- `app/routes/home.tsx` + `app/components/ledger/` — Receipt Ledger UI; all data through `useActionQuery` / `useActionMutation`.

## Template guide (Chat)

Chat lives at `/chat`; the Receipt Ledger is the app home at `/ledger` (`app.homePath`). Search with `rg --hidden --follow`. Key skills: `.agents/skills/actions`, `storing-data`, `real-time-sync`, `context-awareness`, `adding-a-feature`, `frontend-design`, `security`. Local docs only: `pnpm action docs-search --query "<topic>"` / `--slug "<slug>"`; source: `pnpm action source-search --query "<pattern>"`.

- Normal app data flows through actions; keep them deterministic. Never fabricate; verify writes by reading the row or screen.
- `navigation` describes the view (`ledger`, `chat`, `home`) and path; use `view-screen` for selection, open row and filters, `navigate` to move the user.
- UI feedback target 100 ms; acknowledge before network work.
- Guarded verification: run `pnpm agent-native:doctor`; fix findings before done.
