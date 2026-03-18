# Digital Will

A dead man's switch for your assets. Sign in, add your asset details and beneficiaries. If you die (or stop logging in), your asset info is automatically emailed to everyone you've designated.

## How it works

### Death triggers

1. **365-day inactivity** — If you don't log in for a year, you get one warning email with an "I'm alive" link. If you don't respond within 7 days, assets are sent to all beneficiaries.

2. **Beneficiary report** — Each beneficiary gets a unique link. If they click it (or email "barnik is dead" to your configured inbox), you get an "are you alive?" email. If you don't respond within 3 days, assets are sent.

Logging in at any time resets both clocks and dismisses all pending reports.

---

## Tech stack

- **Next.js 14** (App Router) — frontend + API routes
- **Prisma** + **Neon** (serverless Postgres) — database
- **NextAuth.js** — authentication
- **Resend** — outbound email
- **Mailgun** — inbound email parsing (for the "barnik is dead" email trigger)
- **Vercel Cron** — daily checks for inactivity and death reports

---

## Local development

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) account (free) — or any Postgres database
- A [Resend](https://resend.com) account (free)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/digital-will.git
cd digital-will
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
DATABASE_URL="postgresql://..."          # from Neon dashboard
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
RESEND_API_KEY="re_..."                  # from Resend dashboard
FROM_EMAIL="you@yourdomain.com"          # verified sender in Resend
CRON_SECRET="any-random-string"
INBOUND_WEBHOOK_SECRET="any-random-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Push database schema

```bash
npx prisma db push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel + GitHub)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/digital-will.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Add all environment variables (from your `.env.local`, but update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production URL)
4. Deploy

### 3. Configure your domain (barnikbh.com)

In Vercel → Project → Settings → Domains:
- Add `barnikbh.com` (or a subdomain like `will.barnikbh.com`)
- Vercel will show you DNS records to add at your registrar

Update your env vars:
```
NEXTAUTH_URL=https://will.barnikbh.com
NEXT_PUBLIC_APP_URL=https://will.barnikbh.com
```

### 4. Set up inbound email (Mailgun) — for the "barnik is dead" email trigger

1. Sign up at [mailgun.com](https://mailgun.com) (free: 100 emails/day)
2. Add and verify `barnikbh.com` as a sending domain
3. Go to **Receive** → **Create Route**:
   - Filter: `match_recipient("dead@barnikbh.com")` (or any address you choose)
   - Action: `forward("https://will.barnikbh.com/api/inbound-email")`
4. In your Mailgun webhook settings, set the signing key and put it in `INBOUND_WEBHOOK_SECRET`
5. Tell your beneficiaries: email **"barnik is dead"** to `dead@barnikbh.com`

---

## API reference

| Route | Description |
|---|---|
| `POST /api/register` | Create account |
| `POST /api/auth/[...nextauth]` | Sign in / out |
| `GET /api/assets` | List assets |
| `POST /api/assets` | Add asset |
| `PUT /api/assets/[id]` | Edit asset |
| `DELETE /api/assets/[id]` | Delete asset |
| `GET /api/beneficiaries` | List beneficiaries |
| `POST /api/beneficiaries` | Add beneficiary |
| `DELETE /api/beneficiaries/[id]` | Remove beneficiary |
| `POST /api/report-death/[token]` | Beneficiary reports death |
| `GET /api/confirm-alive?token=...` | User confirms alive via email link |
| `POST /api/inbound-email` | Mailgun webhook for inbound email |
| `GET /api/cron/check-inactivity` | Vercel Cron — 365-day check |
| `GET /api/cron/check-death-reports` | Vercel Cron — 3-day report check |

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon (or any Postgres) connection string |
| `NEXTAUTH_URL` | Yes | Your app's URL |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing |
| `RESEND_API_KEY` | Yes | Resend API key for outbound email |
| `FROM_EMAIL` | Yes | Verified sender address in Resend |
| `CRON_SECRET` | Yes | Protects cron endpoints from public access |
| `INBOUND_WEBHOOK_SECRET` | No | Validates Mailgun webhook requests |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL (used in beneficiary links) |
