-- Drink Water schema: profiles, water_logs, push_subscriptions
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create type activity_level as enum ('sedentary', 'normal', 'active', 'very_active');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  weight_kg numeric,
  height_cm numeric,
  activity_level activity_level not null default 'normal',
  daily_goal_ml integer not null default 2000,
  glass_size_ml integer not null default 250,
  bottle_size_ml integer not null default 600,
  reminder_enabled boolean not null default false,
  reminder_interval_min integer not null default 120,
  reminder_start time not null default '08:00',
  reminder_end time not null default '22:00',
  timezone text not null default 'Asia/Bangkok',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz not null default now(),
  log_date date not null,
  client_id text not null,
  unique (user_id, client_id)
);

create index water_logs_user_date_idx on water_logs (user_id, log_date);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Row Level Security: every table restricted to the owning user.
alter table profiles enable row level security;
alter table water_logs enable row level security;
alter table push_subscriptions enable row level security;

create policy "profiles: owner select" on profiles for select using (auth.uid() = id);
create policy "profiles: owner insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles: owner update" on profiles for update using (auth.uid() = id);

create policy "water_logs: owner select" on water_logs for select using (auth.uid() = user_id);
create policy "water_logs: owner insert" on water_logs for insert with check (auth.uid() = user_id);
create policy "water_logs: owner update" on water_logs for update using (auth.uid() = user_id);
create policy "water_logs: owner delete" on water_logs for delete using (auth.uid() = user_id);

create policy "push_subscriptions: owner select" on push_subscriptions for select using (auth.uid() = user_id);
create policy "push_subscriptions: owner insert" on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_subscriptions: owner delete" on push_subscriptions for delete using (auth.uid() = user_id);

-- Auto-create an empty profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
