-- Fixes "new row violates row-level security policy for table groups" when
-- creating a group. INSERT ... RETURNING also enforces the SELECT policy on
-- the row it returns — but at insert time the owner isn't in group_members
-- yet (that's a second, separate insert right after), so is_group_member()
-- was false for that moment and the whole create was rejected. An owner
-- should always be able to see their own group regardless of that timing.
drop policy "groups: member select" on groups;
create policy "groups: member select" on groups for select using (
  is_group_member(groups.id, auth.uid()) or groups.owner_id = auth.uid()
);
