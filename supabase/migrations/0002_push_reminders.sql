-- Tracks the last time a push reminder was sent, so the cron tick (every
-- few minutes) doesn't re-notify a user faster than their chosen interval.
alter table profiles add column last_reminder_sent_at timestamptz;

-- Enabled by default on Supabase projects; safe to run again if already on.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace <PROJECT_REF> and <CRON_SECRET> before running (see docs/PUSH_SETUP.md).
-- CRON_SECRET must match the same value set as an Edge Function secret.
select cron.schedule(
  'send-water-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-water-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    )
  );
  $$
);
