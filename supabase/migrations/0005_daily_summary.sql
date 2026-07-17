-- Opt-in end-of-day summary push notification, sent once per user's local day.
alter table profiles add column daily_summary_enabled boolean not null default false;
alter table profiles add column last_daily_summary_sent_date date;

-- Enabled by default on Supabase projects; safe to run again if already on.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace <PROJECT_REF> and <CRON_SECRET> before running (see docs/PUSH_SETUP.md).
-- CRON_SECRET must match the same value set as an Edge Function secret.
select cron.schedule(
  'send-daily-summary',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    )
  );
  $$
);
