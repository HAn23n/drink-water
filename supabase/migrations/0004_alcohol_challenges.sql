-- Alcohol logs: record-only (does not affect the water goal). Shown alongside
-- water history with a hydration reminder after each entry.
create table alcohol_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drink_type text not null check (drink_type in ('beer', 'wine', 'spirit', 'other')),
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz not null default now(),
  log_date date not null
);

create index alcohol_logs_user_date_idx on alcohol_logs (user_id, log_date);

alter table alcohol_logs enable row level security;

create policy "alcohol_logs: owner select" on alcohol_logs for select using (auth.uid() = user_id);
create policy "alcohol_logs: owner insert" on alcohol_logs for insert with check (auth.uid() = user_id);
create policy "alcohol_logs: owner delete" on alcohol_logs for delete using (auth.uid() = user_id);

-- Opt-in challenges: separate from the passive streak/badge system. A user
-- starts one explicitly; it resolves to 'completed' or 'failed' once its
-- window has passed, evaluated client-side against water_logs.
create table challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_days integer not null check (target_days > 0),
  started_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index challenges_user_status_idx on challenges (user_id, status);

alter table challenges enable row level security;

create policy "challenges: owner select" on challenges for select using (auth.uid() = user_id);
create policy "challenges: owner insert" on challenges for insert with check (auth.uid() = user_id);
create policy "challenges: owner update" on challenges for update using (auth.uid() = user_id);
