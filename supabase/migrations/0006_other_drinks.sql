-- Sweet/caffeinated drinks (coffee, tea, milk tea, smoothies, etc). These count
-- toward the water goal at a reduced rate (they're mostly water but caffeine and
-- sugar make them less hydrating than plain water), and bump the day's effective
-- goal up a bit to compensate for that — both ratios live in src/lib/otherDrinks.ts.
create table other_drink_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drink_type text not null check (drink_type in ('coffee', 'tea', 'milk_tea', 'smoothie', 'other')),
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz not null default now(),
  log_date date not null
);

create index other_drink_logs_user_date_idx on other_drink_logs (user_id, log_date);

alter table other_drink_logs enable row level security;

create policy "other_drink_logs: owner select" on other_drink_logs for select using (auth.uid() = user_id);
create policy "other_drink_logs: owner insert" on other_drink_logs for insert with check (auth.uid() = user_id);
create policy "other_drink_logs: owner delete" on other_drink_logs for delete using (auth.uid() = user_id);
