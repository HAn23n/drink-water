import { supabase } from './supabase'

export interface Group {
  id: string
  name: string
  owner_id: string
  invite_code: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  display_name: string
  joined_at: string
}

/** Only ever %-of-goal and rank points — never raw ml, weight, or anything
 *  else a groupmate shouldn't see. See migration 0009 for the RLS that backs this. */
export interface GroupProgressSnapshot {
  user_id: string
  log_date: string
  percent_of_goal: number
  rank_points: number
}

/** Creates the group and adds the caller as its first member — all
 *  server-side via the create_group_with_owner() RPC so the two writes are
 *  atomic (a client-side failure between them used to leave an orphaned
 *  group with no members) and group_members has no direct-insert path left
 *  for it to race with. */
export async function createGroup(displayName: string, name: string): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group_with_owner', { p_name: name, p_display_name: displayName })
  if (error) throw error
  return data
}

/** Looks up the group by code, enforces the 8-member cap, and adds the caller
 *  as a member — all server-side via the join_group_by_code() RPC so invite
 *  codes aren't enumerable through a public "select group by code" policy. */
export async function joinGroupByCode(code: string): Promise<Group> {
  const { data, error } = await supabase.rpc('join_group_by_code', { p_invite_code: code.trim().toUpperCase() })
  if (error) throw error
  return data
}

export async function fetchMyGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(id, name, owner_id, invite_code, created_at)')
    .eq('user_id', userId)
  if (error) throw error
  // The untyped client can't know this embed is many-to-one, so it types the
  // relation as an array either way — normalize both possible runtime shapes.
  const rows = (data ?? []) as { groups: Group | Group[] | null }[]
  return rows.flatMap((row) => (Array.isArray(row.groups) ? row.groups : row.groups ? [row.groups] : []))
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('id, group_id, user_id, display_name, joined_at')
    .eq('group_id', groupId)
  if (error) throw error
  return data ?? []
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
  if (error) throw error
}

export async function upsertMyProgressSnapshot(
  userId: string,
  logDate: string,
  percentOfGoal: number,
  rankPoints: number,
): Promise<void> {
  const { error } = await supabase.from('group_progress_snapshots').upsert(
    {
      user_id: userId,
      log_date: logDate,
      percent_of_goal: Math.round(percentOfGoal * 10) / 10,
      rank_points: rankPoints,
    },
    { onConflict: 'user_id,log_date' },
  )
  if (error) throw error
}

/** Snapshots for a set of groupmates since `sinceDate` — used to build both
 *  the daily and weekly leaderboard views from the same fetch. */
export async function fetchGroupSnapshots(userIds: string[], sinceDate: string): Promise<GroupProgressSnapshot[]> {
  if (userIds.length === 0) return []
  const { data, error } = await supabase
    .from('group_progress_snapshots')
    .select('user_id, log_date, percent_of_goal, rank_points')
    .in('user_id', userIds)
    .gte('log_date', sinceDate)
  if (error) throw error
  return data ?? []
}

/** Keeps the denormalized display_name in group_members in sync after a
 *  profile edit — a no-op if the user isn't in any group. */
export async function syncDisplayNameAcrossGroups(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase.from('group_members').update({ display_name: displayName }).eq('user_id', userId)
  if (error) throw error
}
