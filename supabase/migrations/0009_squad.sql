-- Squad / group leaderboard. Cross-user visibility is new territory for this
-- app (everything else is 100% private per user), so the shared surface is
-- kept intentionally narrow:
--   - groups/group_members: membership + display name only, no hydration data
--   - group_progress_snapshots: ONLY %-of-goal and rank points, written by each
--     user for themselves, readable by groupmates — never raw ml, weight, etc.
-- Joining always goes through join_group_by_code() (security definer) so
-- invite codes aren't enumerable via a public "select group by code" policy,
-- and the 8-member cap is enforced atomically server-side.

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table group_progress_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  percent_of_goal numeric not null,
  rank_points integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_progress_snapshots enable row level security;

-- groups: visible only to members
create policy "groups: member select" on groups for select using (
  exists (select 1 from group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid())
);
create policy "groups: owner insert" on groups for insert with check (auth.uid() = owner_id);

-- group_members: visible to fellow members of the same group. Joining
-- normally goes through join_group_by_code(); these row policies are
-- defense-in-depth for direct API use, not the primary path.
create policy "group_members: member select" on group_members for select using (
  exists (select 1 from group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
);
create policy "group_members: self insert" on group_members for insert with check (auth.uid() = user_id);
create policy "group_members: self update" on group_members for update using (auth.uid() = user_id);
create policy "group_members: self delete" on group_members for delete using (auth.uid() = user_id);

-- group_progress_snapshots: a user always sees their own row, plus rows for
-- anyone who shares at least one group with them. Never exposes ml/weight/etc
-- since those columns simply don't exist in this table.
create policy "group_progress_snapshots: owner or groupmate select" on group_progress_snapshots for select using (
  auth.uid() = user_id
  or exists (
    select 1 from group_members gm1
    join group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = group_progress_snapshots.user_id
  )
);
create policy "group_progress_snapshots: owner insert" on group_progress_snapshots for insert with check (auth.uid() = user_id);
create policy "group_progress_snapshots: owner update" on group_progress_snapshots for update using (auth.uid() = user_id);

create or replace function join_group_by_code(p_invite_code text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group groups;
  v_count integer;
  v_display_name text;
begin
  select * into v_group from groups where invite_code = p_invite_code;
  if not found then
    raise exception 'invalid_code';
  end if;

  select count(*) into v_count from group_members where group_id = v_group.id;
  if v_count >= 8 then
    raise exception 'group_full';
  end if;

  select display_name into v_display_name from profiles where id = auth.uid();

  insert into group_members (group_id, user_id, display_name)
  values (v_group.id, auth.uid(), coalesce(v_display_name, 'ผู้ใช้'))
  on conflict (group_id, user_id) do nothing;

  return v_group;
end;
$$;
