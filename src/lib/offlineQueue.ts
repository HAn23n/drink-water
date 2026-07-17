import { get, set } from 'idb-keyval'

export interface QueuedWaterLog {
  client_id: string
  user_id: string
  amount_ml: number
  logged_at: string
  log_date: string
}

const QUEUE_KEY = 'drink-water:pending-logs'

export async function getQueue(): Promise<QueuedWaterLog[]> {
  return (await get<QueuedWaterLog[]>(QUEUE_KEY)) ?? []
}

export async function enqueue(entry: QueuedWaterLog): Promise<void> {
  const queue = await getQueue()
  queue.push(entry)
  await set(QUEUE_KEY, queue)
}

export async function removeFromQueue(clientId: string): Promise<void> {
  const queue = await getQueue()
  await set(
    QUEUE_KEY,
    queue.filter((entry) => entry.client_id !== clientId),
  )
}
