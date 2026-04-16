# Digital Will — Claude Context

## What it does
Dead man's switch that transmits Barnik's asset holdings and passwords to beneficiaries upon death.

**Death triggers:**
1. 365 days no login → warning email → 7-day response window → send assets to beneficiaries
2. Beneficiary submits death report via unique link → "are you alive?" email → 3-day window → send assets

## Live site
- **URL:** https://will.barnikbh.com
- **Stack:** Next.js 14 (App Router), Prisma + Neon (Postgres), NextAuth.js credentials, Resend (email), Vercel Cron
- **Hosting:** Vercel (auto-deploys on push to `main`)

## Key file structure
```
app/
├── dashboard/page.tsx          — main UI (assets, passwords, beneficiaries, test email)
├── page.tsx                    — landing (login / beneficiary OTP flow)
├── report-death/[token]/       — beneficiary death report page
└── api/
    ├── assets/                 — CRUD for financial assets (GET, POST, [id] PUT/DELETE)
    ├── passwords/              — CRUD for passwords (GET, POST, [id] PUT/DELETE)
    ├── beneficiaries/          — CRUD for beneficiaries
    ├── beneficiary/
    │   ├── send-otp/           — sends 6-digit OTP to beneficiary email
    │   └── verify-otp/         — verifies OTP, returns beneficiary info
    ├── test-email/             — POST: sends [TEST] preview email to any address (auth required)
    ├── report-death/[token]/   — beneficiary reports death
    ├── confirm-alive/          — user clicks "I'm alive" link
    ├── register/               — single-user registration
    ├── user-exists/            — check if app is initialised
    └── cron/
        ├── check-death-reports/ — daily: trigger assets email after 3-day window
        └── check-inactivity/   — daily: warn/trigger after 365-day inactivity
lib/
├── crypto.ts   — AES-256-GCM encrypt/decrypt (encryptField, decryptField, decryptAsset)
├── email.ts    — all email templates (sendAssetsEmail, sendAliveCheckEmail, sendInactivityWarningEmail)
├── auth.ts     — NextAuth credentials provider, rate limiting, session handling
├── db.ts       — Prisma singleton
└── rate-limit.ts
```

## Database schema (Prisma + Neon Postgres)
- **User** — id, email, password (bcrypt), name, lastLoginAt, aliveToken, aliveCheckAt
- **Asset** — id, userId, name, type, description, value, notes (all sensitive fields AES encrypted)
  - `type` values: `bank`, `investment`, `property`, `crypto`, `insurance`, `vehicle`, `other`, `password`
- **Beneficiary** — id, userId, name, email, token (unique, used in death report URL)
- **BeneficiaryOTP** — temp 10-min OTP codes
- **DeathReport** — id, userId, beneficiaryId, reportedAt, status (pending/dismissed/triggered)

## Encryption
- **Algorithm:** AES-256-GCM, key from `DATA_ENCRYPTION_KEY` env var (64 hex chars = 32 bytes)
- **Encrypted fields on Asset:** name, description, value, notes
- **Format:** `enc:<iv-b64>:<authTag-b64>:<ciphertext-b64>`
- Always use `encryptField()` on save, `decryptAsset()` on fetch/email send

## Passwords section
Passwords reuse the `Asset` model with `type: "password"`. Field mapping:
- `name` → service/site name
- `description` → username or email
- `value` → password
- `notes` → URL or extra notes

All fields encrypted. Passwords appear as a separate table in the beneficiary email.

## Email system (lib/email.ts via Resend)
- `sendAssetsEmail(beneficiaries, assets, userName, testEmail?)` — sends financial assets + passwords tables. If `testEmail` provided, sends only to that address with `[TEST]` subject prefix and warning banner.
- `sendAliveCheckEmail(userEmail, userName, aliveToken, reporterName)` — "are you alive?" with confirm link
- `sendInactivityWarningEmail(userEmail, userName, aliveToken)` — 365-day inactivity warning

## Test email feature
- Route: `POST /api/test-email` (auth required)
- Sends full beneficiary email (assets + passwords) to any specified address
- Subject: `[TEST] Asset information from {name}`
- Yellow warning banner inside email: "This is a test email"
- No death logic triggered, no DB records created

## Required env vars (Vercel + .env.local)
| Key | Purpose |
|-----|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `NEXTAUTH_SECRET` | JWT secret |
| `NEXTAUTH_URL` | https://will.barnikbh.com |
| `NEXT_PUBLIC_APP_URL` | https://will.barnikbh.com |
| `RESEND_API_KEY` | Resend email API |
| `FROM_EMAIL` | Sender address (e.g. will@barnikbh.com) |
| `DATA_ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM |
| `CRON_SECRET` | Bearer token for cron job auth |
| `INBOUND_WEBHOOK_SECRET` | Mailgun inbound webhook secret |

## Security notes
- OTP rate-limited: 10 attempts/IP/15 min
- Login rate-limited: 10 attempts/IP/15 min
- Session: JWT, 5-minute max age
- All sensitive asset/password fields encrypted at rest
- Test email endpoint requires active session — cannot be triggered unauthenticated

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
