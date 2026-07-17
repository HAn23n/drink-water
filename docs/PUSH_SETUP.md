# Web Push setup (Type B reminders)

Local reminders (Type A, in `src/lib/notifications.ts`) work as soon as a user
grants notification permission — no setup needed. Type B lets reminders fire
even when the app is closed, and needs a one-time setup on your own Supabase
project.

## 1. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

This prints a public and private key pair. Put the public one in your `.env`:

```
VITE_VAPID_PUBLIC_KEY=<public key>
```

## 2. Set Edge Function secrets

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and link your
project, then set:

```bash
supabase secrets set VAPID_PUBLIC_KEY=<public key>
supabase secrets set VAPID_PRIVATE_KEY=<private key>
supabase secrets set VAPID_SUBJECT=mailto:you@example.com
supabase secrets set CRON_SECRET=<any long random string you generate yourself>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to
Edge Functions — no need to set them yourself.

## 3. Deploy the Edge Function(s)

```bash
supabase functions deploy send-water-reminders --no-verify-jwt
supabase functions deploy send-daily-summary --no-verify-jwt
```

`--no-verify-jwt` is required because pg_cron calls these functions with your
own `CRON_SECRET`, not a Supabase user JWT — each function checks that secret
itself (see `supabase/functions/*/index.ts`).

`send-daily-summary` is optional — only needed if you want the end-of-day
summary push toggle in Profile to actually send anything. It reuses the same
VAPID/CRON_SECRET secrets from step 2.

## 4. Run the migrations

Run every file in `supabase/migrations/` in order, in the Supabase SQL editor
(or `supabase db push`). Before running `0002_push_reminders.sql` and
`0005_daily_summary.sql`, replace:

- `<PROJECT_REF>` with your project ref (the subdomain in your Supabase URL)
- `<CRON_SECRET>` with the same value you set as the `CRON_SECRET` secret

## 5. Test it

Toggle on reminders in the app's Profile page — this subscribes the current
device to push and enables `reminder_enabled`. You can trigger the function
manually to test without waiting for the cron tick:

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-water-reminders \
  -H "Authorization: Bearer <CRON_SECRET>"
```

If nothing arrives, check `reminder_start`/`reminder_end` cover the current
time in your profile's timezone, and that `supabase functions logs
send-water-reminders` shows no errors.
