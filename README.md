# 💧 Drink Water

PWA สำหรับติดตามปริมาณน้ำที่ดื่มในแต่ละวัน — คำนวณเป้าหมายจากน้ำหนัก/ระดับกิจกรรม, สะสมยอดรายวัน, มีกราฟ/สถิติย้อนหลัง, แจ้งเตือนให้ดื่มน้ำ, และใช้งานได้แบบออฟไลน์

Design spec: [`docs/superpowers/specs/2026-07-17-drink-water-pwa-design.md`](docs/superpowers/specs/2026-07-17-drink-water-pwa-design.md)

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS v4
- Supabase (Auth + Postgres + Edge Functions) — all free tier
- vite-plugin-pwa (installable app + service worker)
- Recharts (history graph)
- Vitest (unit tests for the pure calculation/logic libs)

## Project structure

```
src/
  lib/            business logic + Supabase access, no JSX
    water.ts         daily goal / BMI / timezone-aware date math (unit tested)
    history.ts        weekly totals + streak calculation (unit tested)
    profile.ts         profile CRUD
    waterLogs.ts        add/delete/fetch logs, merges server + offline queue
    offlineQueue.ts     generic IndexedDB-backed pending-write queue
    notifications.ts    local (Type A) + web push (Type B) reminders
    AuthContext.tsx      Supabase session as React context
    ProtectedRoute.tsx   route guards
    useInstallPrompt.ts  "Add to Home Screen" hook
  components/     shared UI (WaveCircle, BottomNav)
  features/       one folder per screen (auth, onboarding, home, history, profile)
  sw.ts           custom service worker source (push notifications + precache)
supabase/
  migrations/     SQL schema + RLS policies
  functions/      Edge Function for Web Push (Type B reminders)
docs/
  PUSH_SETUP.md   one-time setup for Web Push (VAPID keys, cron, deploy)
```

Each `lib/*.ts` file has one job and doesn't import React — that's what keeps
`water.ts` and `history.ts` easy to unit test and easy to reuse if you ever
add another screen.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run `supabase/migrations/0001_init.sql` then
   `supabase/migrations/0002_push_reminders.sql` (edit the two placeholders
   inside `0002` first — see comments in that file).
3. In Supabase Auth settings, enable the **Google** provider if you want
   Google sign-in (email/password works out of the box).
4. Copy `.env.example` to `.env` and fill in your project's URL and anon key
   (Project Settings → API).
5. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Web Push (Type B, reminders while the app is closed) needs one more
one-time setup — see [`docs/PUSH_SETUP.md`](docs/PUSH_SETUP.md). Local
reminders (Type A, while the app is open) work without it.

## Scripts

```bash
npm run dev       # start dev server
npm run build     # type-check + production build
npm run test      # run unit tests (vitest)
npm run lint      # oxlint
npm run preview   # preview the production build locally
```

## Deploying

The frontend deploys to [Vercel](https://vercel.com)'s free tier:

1. Push this repo to GitHub.
2. Import it in Vercel — framework preset "Vite" is auto-detected.
3. Add the same three `VITE_*` environment variables from your `.env` in
   the Vercel project settings.
4. Deploy. Share the resulting URL — anyone can sign up and use it, each
   user only sees their own data (enforced by Postgres Row Level Security).

## Notes on the two reminder types

- **Type A (local):** fires via the page's Notification API while the tab
  is open. No setup needed beyond the user granting permission in Profile.
- **Type B (push):** fires even when the app is fully closed, via a
  Supabase Edge Function on a `pg_cron` schedule. Requires the one-time
  setup in `docs/PUSH_SETUP.md`. If that setup is skipped, reminders
  silently fall back to Type A only — nothing breaks.
