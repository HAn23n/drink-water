-- Fixes "infinite recursion detected in policy for relation group_members"
-- (Postgres 42P17). The group_members select policy subqueried group_members
-- itself to check membership — evaluating that subquery re-triggers the same
-- policy on every row, forever. A SECURITY DEFINER helper breaks the cycle by
-- running the membership check with RLS bypassed (it only ever answers "is
-- this exact (group, user) pair a member?", not a general-purpose escape hatch).
create or replace function is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

drop policy "groups: member select" on groups;
create policy "groups: member select" on groups for select using (
  is_group_member(groups.id, auth.uid())
);

drop policy "group_members: member select" on group_members;
create policy "group_members: member select" on group_members for select using (
  is_group_member(group_members.group_id, auth.uid())
);
