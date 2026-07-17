import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabase'
import { enqueue, getQueue, removeFromQueue, type QueuedWaterLog } from './offlineQueue'
import { logDateInTimeZone } from './water'

export interface WaterLog {
  id: string | null // null while still only in the offline queue
  client_id: string
  amount_ml: number
  logged_at: string
  log_date: string
}

export async function addWaterLog(
  userId: string,
  amountMl: number,
  timezone: string,
): Promise<void> {
  const now = new Date()
  const entry: QueuedWaterLog = {
    client_id: uuidv4(),
    user_id: userId,
    amount_ml: amountMl,
    logged_at: now.toISOString(),
    log_date: logDateInTimeZone(now, timezone),
  }
  // Always land in the local queue first so a dropped connection never loses the entry.
  await enqueue(entry)
  await syncPendingLogs(userId)
}

/** Pushes any queued logs to Supabase. Safe to call repeatedly (e.g. on reconnect). */
export async function syncPendingLogs(userId: string): Promise<void> {
  const queue = await getQueue()
  for (const entry of queue.filter((e) => e.user_id === userId)) {
    const { error } = await supabase.from('water_logs').upsert(entry, {
      onConflict: 'user_id,client_id',
      ignoreDuplicates: true,
    })
    if (error) {
      if (error.code === 'PGRST301' || error.message.toLowerCase().includes('fetch')) {
        return // offline — stop and retry the whole batch next time
      }
      // Any other error (bad data, RLS) — drop it so it doesn't block the queue forever.
    }
    await removeFromQueue(entry.client_id)
  }
}

export async function deleteWaterLog(id: string): Promise<void> {
  const { error } = await supabase.from('water_logs').delete().eq('id', id)
  if (error) throw error
}

export async function fetchLogsForDate(userId: string, logDate: string): Promise<WaterLog[]> {
  const { data, error } = await supabase
    .from('water_logs')
    .select('id, client_id, amount_ml, logged_at, log_date')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .order('logged_at', { ascending: true })
  if (error) throw error

  const serverLogs: WaterLog[] = data ?? []
  const serverClientIds = new Set(serverLogs.map((log) => log.client_id))

  const queued = await getQueue()
  const pendingLogs: WaterLog[] = queued
    .filter((entry) => entry.user_id === userId && entry.log_date === logDate)
    .filter((entry) => !serverClientIds.has(entry.client_id))
    .map((entry) => ({ id: null, ...entry }))

  return [...serverLogs, ...pendingLogs]
}
