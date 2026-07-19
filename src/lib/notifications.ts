import { supabase } from './supabase'
import type { Profile } from './profile'

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

function currentTimeInZone(timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

function isWithinWindow(now: string, start: string, end: string): boolean {
  // Handles windows that wrap past midnight, e.g. 22:00-06:00.
  return start <= end ? now >= start && now <= end : now >= start || now <= end
}

/**
 * Type A reminders: fire while this tab is open, via the page-level Notification API.
 * Returns a cleanup function to stop the timer.
 */
export function startLocalReminders(profile: Profile): () => void {
  if (!profile.reminder_enabled || Notification.permission !== 'granted') {
    return () => {}
  }

  // Floored defensively — a stored value of 0 would otherwise call
  // setInterval(fn, 0), firing continuously at the browser-clamped minimum.
  const intervalMs = Math.max(5, profile.reminder_interval_min) * 60_000
  const timer = setInterval(() => {
    const now = currentTimeInZone(profile.timezone)
    if (isWithinWindow(now, profile.reminder_start.slice(0, 5), profile.reminder_end.slice(0, 5))) {
      new Notification('ถึงเวลาดื่มน้ำแล้ว 💧', {
        body: 'อย่าลืมดื่มน้ำนะ เปิดแอปเพื่อบันทึก',
        icon: '/icons/icon-192.png',
      })
    }
  }, intervalMs)

  return () => clearInterval(timer)
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

/** Type B: subscribes this device to Web Push so reminders fire even when the app is closed. */
export async function subscribeToPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) return

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    }))

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

  await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'user_id,endpoint' },
  )
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}
