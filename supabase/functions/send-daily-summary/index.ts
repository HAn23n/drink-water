// Supabase Edge Function (Deno). Invoked on a schedule by pg_cron (see
// supabase/migrations/0005_daily_summary.sql). Once per user's local day, once
// local time has crossed SUMMARY_LOCAL_TIME, sends a push notification
// summarizing that day's water total.
import webpush from 'https://esm.sh/web-push@3.6.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const SUMMARY_LOCAL_TIME = '21:00'

function localDateAndTime(timezone: string): { date: string; time: string } {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
  return { date, time }
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, timezone, daily_goal_ml, caffeine_compensation_ratio, last_daily_summary_sent_date')
    .eq('daily_summary_enabled', true)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let sent = 0

  for (const profile of profiles ?? []) {
    const { date: today, time: now } = localDateAndTime(profile.timezone)
    if (now < SUMMARY_LOCAL_TIME) continue
    if (profile.last_daily_summary_sent_date === today) continue

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', profile.id)
    if (!subscriptions?.length) continue

    const [{ data: logs }, { data: otherLogs }] = await Promise.all([
      supabase.from('water_logs').select('amount_ml').eq('user_id', profile.id).eq('log_date', today),
      supabase.from('other_drink_logs').select('amount_ml').eq('user_id', profile.id).eq('log_date', today),
    ])
    const totalMl = (logs ?? []).reduce((sum: number, row: { amount_ml: number }) => sum + row.amount_ml, 0)
    const otherMl = (otherLogs ?? []).reduce((sum: number, row: { amount_ml: number }) => sum + row.amount_ml, 0)
    // Mirrors src/lib/otherDrinks.ts's otherDrinkWaterCredit/otherDrinkGoalCompensation —
    // keep in sync with those ratios if they ever change.
    const effectiveMl = totalMl + Math.round(otherMl * 0.5)
    const effectiveGoalMl = profile.daily_goal_ml + Math.round(otherMl * profile.caffeine_compensation_ratio)
    const percent = effectiveGoalMl > 0 ? Math.round((effectiveMl / effectiveGoalMl) * 100) : 0

    const payload = JSON.stringify({
      title: 'สรุปการดื่มน้ำวันนี้ 💧',
      body:
        effectiveMl >= effectiveGoalMl
          ? `เก่งมาก! วันนี้ดื่มไป ${totalMl.toLocaleString()} ml ครบเป้าหมายแล้ว`
          : `วันนี้ดื่มไป ${totalMl.toLocaleString()} ml (${percent}%) ของเป้าหมาย ${profile.daily_goal_ml.toLocaleString()} ml`,
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

    await supabase.from('profiles').update({ last_daily_summary_sent_date: today }).eq('id', profile.id)
    sent++
  }

  return new Response(JSON.stringify({ checked: profiles?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
