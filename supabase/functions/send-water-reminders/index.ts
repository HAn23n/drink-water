// Supabase Edge Function (Deno). Invoked on a schedule by pg_cron (see
// supabase/migrations/0002_push_reminders.sql). For each user with reminders
// enabled who is currently inside their reminder window and hasn't been
// notified within their chosen interval, sends a Web Push notification to
// every device they've subscribed on.
import webpush from 'https://esm.sh/web-push@3.6.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

function currentTimeInZone(timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

function isWithinWindow(now: string, start: string, end: string): boolean {
  return start <= end ? now >= start && now <= end : now >= start || now <= end
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, timezone, reminder_start, reminder_end, reminder_interval_min, last_reminder_sent_at')
    .eq('reminder_enabled', true)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const now = new Date()
  let sent = 0

  for (const profile of profiles ?? []) {
    const withinWindow = isWithinWindow(
      currentTimeInZone(profile.timezone),
      profile.reminder_start.slice(0, 5),
      profile.reminder_end.slice(0, 5),
    )
    if (!withinWindow) continue

    const elapsedMin = profile.last_reminder_sent_at
      ? (now.getTime() - new Date(profile.last_reminder_sent_at).getTime()) / 60_000
      : Infinity
    if (elapsedMin < profile.reminder_interval_min) continue

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', profile.id)
    if (!subscriptions?.length) continue

    const payload = JSON.stringify({
      title: 'ถึงเวลาดื่มน้ำแล้ว 💧',
      body: 'อย่าลืมดื่มน้ำนะ เปิดแอปเพื่อบันทึก',
    })

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is stale (browser data cleared, uninstalled, etc.) — stop tracking it.
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    await supabase.from('profiles').update({ last_reminder_sent_at: now.toISOString() }).eq('id', profile.id)
    sent++
  }

  return new Response(JSON.stringify({ checked: profiles?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
