-- Streak freeze: protects one missed day's streak continuity per calendar week
-- (Monday-start, matching the app's week convention). The unique constraint on
-- (user_id, week_start) is the server-side backstop for "1 per week" — the
-- client also checks before offering the button.
create table streak_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  applied_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table streak_freezes enable row level security;

create policy "streak_freezes: owner select" on streak_freezes for select using (auth.uid() = user_id);
create policy "streak_freezes: owner insert" on streak_freezes for insert with check (auth.uid() = user_id);
