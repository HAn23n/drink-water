-- Closes two gaps found in code review:
--
-- 1. group_members's "self insert" policy only checked auth.uid() = user_id,
--    with no invite-code or 8-member-cap check — both only lived inside
--    join_group_by_code(). Any client could insert directly into group_members
--    via the REST API and join any group, bypassing both checks entirely.
--    Fix: drop the direct-insert policy so ALL membership rows must come
--    through a security-definer RPC. createGroup() also used to do two
--    separate client-side inserts (groups, then group_members) with no
--    transaction — a failure between them orphaned the group. A new
--    create_group_with_owner() RPC replaces that two-step client flow with
--    one atomic call, matching the pattern join_group_by_code() already uses.
--
-- 2. group_progress_snapshots trusted whatever percent_of_goal/rank_points
--    the client sent, letting a user fabricate a leaderboard-topping score.
--    Full server-side recomputation would mean re-implementing the effective-
--    goal/compensation logic in SQL, which is disproportionate for a
--    friends-group leaderboard — a CHECK constraint bounding both columns to
--    plausible ranges stops the obvious abuse case.

drop policy "group_members: self insert" on group_members;

alter table group_progress_snapshots
  add constraint group_progress_snapshots_percent_range check (percent_of_goal >= 0 and percent_of_goal <= 500);
alter table group_progress_snapshots
  add constraint group_progress_snapshots_rank_points_range check (rank_points >= 0 and rank_points <= 100000);

create or replace function create_group_with_owner(p_name text, p_display_name text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group groups;
  v_invite_code text;
begin
  v_invite_code := upper(substr(md5(random()::text), 1, 4) || substr(md5(random()::text), 1, 4));

  insert into groups (name, owner_id, invite_code)
  values (p_name, auth.uid(), v_invite_code)
  returning * into v_group;

  insert into group_members (group_id, user_id, display_name)
  values (v_group.id, auth.uid(), coalesce(nullif(p_display_name, ''), 'ผู้ใช้'));

  return v_group;
end;
$$;
