# FinTrack

FinTrack is a Kenya-focused personal finance app built with Next.js and Supabase. It supports personal finance tracking, shared workspace preview mode, M-Pesa SMS import, CSV export, push notifications, and email-based reminders/digests.

## Product status

- Personal finance is the stable production core.
- Workspace collaboration is preview-only and currently centered on shared transactions, dashboard, insights, and M-Pesa import.
- Budgets, debts, savings, and subscriptions remain personal-only when a workspace is active.

## Core features

- Manual income and expense tracking
- M-Pesa message parsing and guided import review
- Budgets, debts, savings goals, and subscriptions
- Dashboard and insights by personal or workspace scope
- Workspace invitations and shared transaction visibility
- CSV export for personal or workspace transactions
- Optional web push notifications
- Email reminders and weekly digests via Nodemailer

## Tech stack

- Next.js 14 app router
- React 18
- Supabase auth, database, and RLS
- React Query
- Tailwind CSS
- Nodemailer for transactional email

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env.local
```

3. Fill in the required variables in `.env.local`.

4. Run the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Required environment variables

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### App and mail

- `APP_URL`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

### Cron and notifications

- `CRON_SECRET`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`

## Database setup

Run the SQL files in `supabase/migrations` in order:

1. `001_schema.sql`
2. `002_rls.sql`
3. `003_seed_categories.sql`
4. `004_storage.sql`
5. `004_subscriptions.sql`
6. `005_production_readiness.sql`

## M-Pesa import flow

The current production-ready import path is:

1. Paste copied M-Pesa messages into `/dashboard/mpesa`
2. Review parsed transactions
3. Adjust date, description, and category if needed
4. Import into the active personal or workspace scope

The parser now handles rough pasted message blocks more gracefully and flags unsupported lines plus existing duplicates before import.

## Email and cron jobs

Email is the primary delivery channel for:

- workspace invitations
- payment reminders
- weekly digests

Cron endpoints:

- `/api/cron/payment-reminders`
- `/api/cron/weekly-digest`

They require `CRON_SECRET` via `Authorization: Bearer <secret>` or `x-cron-secret`.

### Hosting note

- If you stay on Vercel, these endpoints can run on Vercel Cron.
- If scheduled/background work grows, move the cron execution layer to Render while keeping the same endpoints and mail service.

## Verification

```bash
npm run lint
npm run build
```

## Current implementation notes

- Personal scope excludes workspace data explicitly.
- Workspace scope is limited on purpose to avoid incomplete shared behavior.
- M-Pesa duplicate protection now exists in both app logic and DB-side trigger logic.
- Reminder/digest delivery uses a communication log table to avoid duplicate sends for the same period.
