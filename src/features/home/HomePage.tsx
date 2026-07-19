import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Reorder } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import {
  PlusIcon,
  TrashIcon,
  ClockIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon,
  LightBulbIcon,
  XMarkIcon,
  ChartBarIcon,
  BoltIcon,
  ShieldCheckIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon, FireIcon } from '@heroicons/react/24/solid'
import { LoadingScreen, ErrorScreen } from '../../components/LoadingScreen'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { GlassIcon, BottleIcon } from '../../components/DrinkIcons'
import { NumberField } from '../../components/NumberField'
import { useAuth } from '../../lib/AuthContext'
import { fetchProfile, type Profile } from '../../lib/profile'
import { addWaterLog, deleteWaterLog, fetchLogsForDate, syncPendingLogs, type WaterLog } from '../../lib/waterLogs'
import { removeFromQueue } from '../../lib/offlineQueue'
import { todayInTimeZone, yesterdayInTimeZone } from '../../lib/water'
import { playAddSound, playRankUpSound } from '../../lib/sound'
import { celebrateGoalReached, celebrateRankUp } from '../../lib/celebrate'
import { getTipOfTheDay, getMissDayQuip } from '../../lib/tips'
import { isAlcoholTrackingEnabled } from '../../lib/alcoholPref'
import { getCustomPresets, saveCustomPresets, type CustomPreset } from '../../lib/customPresets'
import { fetchDailyTotals, fetchRankPoints, calculateStreak, type DailyTotal } from '../../lib/history'
import { getRank } from '../../lib/rank'
import {
  fetchOtherDrinkLogsForDate,
  otherDrinkWaterCredit,
  otherDrinkGoalCompensation,
} from '../../lib/otherDrinks'
import {
  fetchRecentStreakFreezes,
  hasFreezeAvailable,
  useStreakFreeze,
  findBrokenStreakDay,
} from '../../lib/streakFreeze'
import { upsertMyProgressSnapshot } from '../../lib/groups'
import {
  getWidgetOrder,
  saveWidgetOrder,
  getHiddenWidgets,
  saveHiddenWidgets,
  DEFAULT_WIDGET_ORDER,
  WIDGET_LABELS,
  type WidgetId,
} from '../../lib/widgetLayout'
import { WaveCircle } from '../../components/WaveCircle'
import { RankBadge } from '../../components/RankBadge'
import { PacingChecklist } from './PacingChecklist'
import { DailySummaryModal } from './DailySummaryModal'
import { AlcoholCard } from './AlcoholCard'
import { OtherDrinksCard } from './OtherDrinksCard'
import { DraggableWidget } from './DraggableWidget'
import { ChallengeCard } from '../history/ChallengeCard'

type TargetDay = 'today' | 'yesterday'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [todayDate, setTodayDate] = useState<string | null>(null)
  const [logs, setLogs] = useState<WaterLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState<number | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<WaterLog | null>(null)
  const [targetDay, setTargetDay] = useState<TargetDay>('today')
  const [backdateNotice, setBackdateNotice] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER)
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>([])
  const [editLayout, setEditLayout] = useState(false)
  const [alcoholEnabled] = useState(() => isAlcoholTrackingEnabled())
  const [recentTotals, setRecentTotals] = useState<DailyTotal[]>([])
  const [lastAdded, setLastAdded] = useState<{ clientId: string; amountMl: number } | null>(null)
  const [presets, setPresets] = useState<CustomPreset[]>([])
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [otherDrinkTotal, setOtherDrinkTotal] = useState(0)
  const [rankPoints, setRankPoints] = useState(0)
  const [frozenDates, setFrozenDates] = useState<Set<string>>(new Set())
  const [freezeAvailable, setFreezeAvailable] = useState(false)
  const [freezing, setFreezing] = useState(false)
  const celebratedRef = useRef(false)
  const nearGoalRef = useRef(false)
  const prevRankTierRef = useRef<number | null>(null)

  // The water totals/list on screen follow whichever day is toggled; streak/tip/alcohol
  // always stay pinned to the real "today" regardless of what's being viewed/backdated.
  const viewDate = profile && todayDate ? (targetDay === 'yesterday' ? yesterdayInTimeZone(profile.timezone) : todayDate) : null

  const reloadLogsForDate = useCallback(async (userId: string, date: string) => {
    setLogs(await fetchLogsForDate(userId, date))
  }, [])

  const reloadOtherDrinksForDate = useCallback(async (userId: string, date: string) => {
    const rows = await fetchOtherDrinkLogsForDate(userId, date)
    setOtherDrinkTotal(rows.reduce((sum, row) => sum + row.amount_ml, 0))
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      try {
        const loadedProfile = await fetchProfile(user!.id)
        if (cancelled) return
        if (!loadedProfile.onboarded) {
          navigate('/onboarding', { replace: true })
          return
        }
        setProfile(loadedProfile)
        setWidgetOrder(getWidgetOrder(user!.id))
        setHiddenWidgets(getHiddenWidgets(user!.id))
        setPresets(getCustomPresets(user!.id))
        await syncPendingLogs(user!.id)
        const today = todayInTimeZone(loadedProfile.timezone)
        setTodayDate(today)
        await Promise.all([reloadLogsForDate(user!.id, today), reloadOtherDrinksForDate(user!.id, today)])
        const totals = await fetchDailyTotals(
          user!.id,
          loadedProfile.timezone,
          loadedProfile.daily_goal_ml,
          30,
          loadedProfile.caffeine_compensation_ratio,
        )
        if (!cancelled) setRecentTotals(totals)
        const points = await fetchRankPoints(
          user!.id,
          loadedProfile.daily_goal_ml,
          loadedProfile.caffeine_compensation_ratio,
        )
        if (!cancelled) setRankPoints(points)
        const [freezes, available] = await Promise.all([
          fetchRecentStreakFreezes(user!.id, totals[0]?.date ?? today),
          hasFreezeAvailable(user!.id, today),
        ])
        if (!cancelled) {
          setFrozenDates(new Set(freezes.map((f) => f.applied_date)))
          setFreezeAvailable(available)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [user, navigate, reloadLogsForDate, reloadOtherDrinksForDate])

  // Refetch whenever the viewed day changes — toggling today/yesterday, or a rollover.
  useEffect(() => {
    if (!user || !viewDate) return
    reloadLogsForDate(user.id, viewDate)
    reloadOtherDrinksForDate(user.id, viewDate)
  }, [user, viewDate, reloadLogsForDate, reloadOtherDrinksForDate])

  // Keep "today" honest across a midnight rollover and reconnects.
  useEffect(() => {
    if (!user || !profile || !viewDate) return

    const onOnline = () => {
      syncPendingLogs(user.id).then(() => reloadLogsForDate(user.id, viewDate))
    }
    window.addEventListener('online', onOnline)

    const dayCheck = setInterval(() => {
      const today = todayInTimeZone(profile.timezone)
      if (today !== todayDate) setTodayDate(today)
    }, 60_000)

    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(dayCheck)
    }
  }, [user, profile, todayDate, viewDate, reloadLogsForDate])

  const totalMl = logs.reduce((sum, log) => sum + log.amount_ml, 0)
  // Sweet/caffeinated drinks count at a reduced rate toward the goal, and bump the
  // goal itself up a bit to compensate — see src/lib/otherDrinks.ts for the ratios.
  const effectiveTotalMl = totalMl + otherDrinkWaterCredit(otherDrinkTotal)
  const effectiveGoalMl = profile
    ? profile.daily_goal_ml + otherDrinkGoalCompensation(otherDrinkTotal, profile.caffeine_compensation_ratio)
    : 0
  const percent = effectiveGoalMl > 0 ? (effectiveTotalMl / effectiveGoalMl) * 100 : 0
  const viewGoalReached = percent >= 100
  // Confetti/banner are about crossing today's goal specifically — not a retroactive backdate.
  const goalReached = targetDay === 'today' && viewGoalReached
  const remainingMl = Math.max(Math.round(effectiveGoalMl - effectiveTotalMl), 0)
  // An encouraging nudge for the home stretch — distinct from the reminder pushes,
  // which fire on a timer regardless of how close today's progress actually is.
  const nearGoal = targetDay === 'today' && !viewGoalReached && percent >= 85

  // Celebrate once per crossing — resets so a later dip-and-recross (e.g. after
  // undoing a log) can celebrate again, but a render while already over 100% won't.
  useEffect(() => {
    if (goalReached && !celebratedRef.current) {
      celebratedRef.current = true
      celebrateGoalReached()
      if (user && profile) {
        fetchRankPoints(user.id, profile.daily_goal_ml, profile.caffeine_compensation_ratio)
          .then(setRankPoints)
          .catch(() => {})
      }
    } else if (!goalReached) {
      celebratedRef.current = false
    }
  }, [goalReached])

  // Keeps this user's row in group_progress_snapshots current — the only thing
  // squad-mates can ever read (see migration 0009), and only %/rank, never ml.
  useEffect(() => {
    if (!user || targetDay !== 'today' || !todayDate || effectiveGoalMl <= 0) return
    upsertMyProgressSnapshot(user.id, todayDate, percent, rankPoints).catch(() => {})
  }, [user, targetDay, todayDate, percent, rankPoints, effectiveGoalMl])

  // Nudge once per crossing into the home stretch, same one-shot pattern as the
  // goal-reached celebration above — only as a notification if already granted,
  // never prompting from a passive background check.
  useEffect(() => {
    if (nearGoal && !nearGoalRef.current) {
      nearGoalRef.current = true
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('ใกล้ถึงเป้าหมายแล้ว!', {
          body: `เหลืออีกแค่ ${remainingMl.toLocaleString()} ml เท่านั้น สู้ต่ออีกนิด 💪`,
          icon: '/icons/icon-192.png',
        })
      }
    } else if (!nearGoal) {
      nearGoalRef.current = false
    }
  }, [nearGoal])

  // Celebrate an actual tier increase — skipped on the very first load, since
  // that's just reporting existing rank, not a fresh promotion.
  useEffect(() => {
    const tier = getRank(rankPoints).tier
    if (prevRankTierRef.current !== null && tier > prevRankTierRef.current) {
      celebrateRankUp()
      playRankUpSound()
      if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160])
    }
    prevRankTierRef.current = tier
  }, [rankPoints])

  async function handleAdd(amountMl: number) {
    if (!user || !profile || !viewDate || amountMl <= 0) return
    try {
      if (targetDay === 'yesterday') {
        await addWaterLog(user.id, amountMl, profile.timezone, viewDate)
        playAddSound()
        await reloadLogsForDate(user.id, viewDate)
        setBackdateNotice(`บันทึก ${amountMl} ml ลงเมื่อวานแล้ว`)
        setTimeout(() => setBackdateNotice(null), 3000)
      } else {
        const clientId = await addWaterLog(user.id, amountMl, profile.timezone)
        playAddSound()
        await reloadLogsForDate(user.id, viewDate)
        setLastAdded({ clientId, amountMl })
        setTimeout(() => setLastAdded((prev) => (prev?.clientId === clientId ? null : prev)), 6000)
      }
      setCustomAmount(null)
      setShowCustom(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function handleUndo() {
    if (!user || !viewDate || !lastAdded) return
    const target = logs.find((l) => l.client_id === lastAdded.clientId)
    setLastAdded(null)
    if (!target) return
    try {
      if (target.id) {
        await deleteWaterLog(target.id)
      } else {
        await removeFromQueue(target.client_id)
      }
      await reloadLogsForDate(user.id, viewDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เลิกทำไม่สำเร็จ')
    }
  }

  async function handleUseFreeze() {
    if (!user || !brokenDay || freezing) return
    setFreezing(true)
    try {
      await useStreakFreeze(user.id, brokenDay)
      setFrozenDates((prev) => new Set(prev).add(brokenDay))
      setFreezeAvailable(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ใช้ตั๋วพักแรงค์ไม่สำเร็จ')
    } finally {
      setFreezing(false)
    }
  }

  function handleSavePreset() {
    if (!user) return
    const amount = customAmount ?? 0
    if (!presetName.trim() || !(amount > 0)) return
    const updated = [...presets, { id: uuidv4(), label: presetName.trim(), amountMl: amount }]
    setPresets(updated)
    saveCustomPresets(user.id, updated)
    setPresetName('')
    setShowSavePreset(false)
  }

  function handleRemovePreset(id: string) {
    if (!user) return
    const updated = presets.filter((p) => p.id !== id)
    setPresets(updated)
    saveCustomPresets(user.id, updated)
  }

  async function handleConfirmDelete() {
    if (!user || !viewDate || !pendingDelete) return
    const log = pendingDelete
    setPendingDelete(null)
    try {
      if (log.id) {
        await deleteWaterLog(log.id)
      } else {
        await removeFromQueue(log.client_id)
      }
      await reloadLogsForDate(user.id, viewDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    }
  }

  function handleReorder(newOrder: WidgetId[]) {
    setWidgetOrder(newOrder)
    if (user) saveWidgetOrder(user.id, newOrder)
  }

  function handleHideWidget(id: WidgetId) {
    if (!user) return
    const updated = [...hiddenWidgets, id]
    setHiddenWidgets(updated)
    saveHiddenWidgets(user.id, updated)
  }

  function handleShowWidget(id: WidgetId) {
    if (!user) return
    const updated = hiddenWidgets.filter((h) => h !== id)
    setHiddenWidgets(updated)
    saveHiddenWidgets(user.id, updated)
  }

  if (loading) return <LoadingScreen />
  if (!profile) {
    return <ErrorScreen message={error ?? 'โหลดข้อมูลไม่สำเร็จ'} onRetry={() => window.location.reload()} />
  }

  // Patch in today's live total so the streak doesn't lag behind what's on screen —
  // only while actually viewing today (viewing/backdating yesterday shouldn't touch it).
  const displayTotals =
    targetDay === 'today' && recentTotals.length > 0 && todayDate === recentTotals[recentTotals.length - 1].date
      ? [
          ...recentTotals.slice(0, -1),
          {
            date: todayDate,
            totalMl,
            effectiveMl: effectiveTotalMl,
            effectiveGoalMl,
            goalMet: effectiveTotalMl >= effectiveGoalMl,
          },
        ]
      : recentTotals
  const streak = calculateStreak(displayTotals, frozenDates)
  // Only offer a freeze for a recent miss (within the last week) — an older gap
  // isn't what "1 per week" is meant to patch over.
  const brokenDay = findBrokenStreakDay(displayTotals, frozenDates)
  const canOfferFreeze =
    targetDay === 'today' &&
    freezeAvailable &&
    brokenDay !== null &&
    todayDate !== null &&
    (new Date(todayDate).getTime() - new Date(brokenDay).getTime()) / 86_400_000 <= 7

  // A light, friendly nudge instead of silence when yesterday came up short —
  // skipped if a freeze already protects it, since that's not really a miss anymore.
  const yesterdayDate = profile ? yesterdayInTimeZone(profile.timezone) : null
  const yesterdayTotal = yesterdayDate ? recentTotals.find((t) => t.date === yesterdayDate) : undefined
  const showMissQuip =
    targetDay === 'today' && yesterdayTotal !== undefined && !yesterdayTotal.goalMet && !frozenDates.has(yesterdayDate!)

  const quickAddOptions = [
    {
      key: 'half',
      label: 'ครึ่งแก้ว',
      amount: Math.round(profile.glass_size_ml / 2),
      icon: <GlassIcon className="h-8 w-8 text-water-400" fillPercent={30} />,
    },
    {
      key: 'glass',
      label: 'แก้ว',
      amount: profile.glass_size_ml,
      icon: <GlassIcon className="h-8 w-8 text-water-500" fillPercent={70} />,
    },
    {
      key: 'bottle',
      label: 'ขวด',
      amount: profile.bottle_size_ml,
      icon: <BottleIcon className="h-8 w-8 text-water-500" fillPercent={65} />,
    },
    {
      key: 'big-bottle',
      label: 'ขวดใหญ่',
      amount: 1400,
      icon: <BottleIcon className="h-8 w-8 text-water-600" fillPercent={90} />,
    },
  ]

  const widgetContent: Record<WidgetId, ReactNode> = {
    streakFreeze:
      canOfferFreeze && brokenDay ? (
        <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-md shadow-water-100">
          <span className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheckIcon className="h-5 w-5 flex-shrink-0 text-water-500" />
            พลาดไป {new Date(`${brokenDay}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} —
            ใช้ตั๋วพักแรงค์กู้ streak ได้นะ (1 ครั้ง/สัปดาห์)
          </span>
          <button
            onClick={handleUseFreeze}
            disabled={freezing}
            className="flex-shrink-0 rounded-full bg-water-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-water-600 disabled:opacity-50"
          >
            ใช้เลย
          </button>
        </div>
      ) : null,
    logs: (
      <div className="w-full max-w-sm">
        <h2 className="mb-2 text-sm font-medium text-slate-500">
          {targetDay === 'yesterday' ? 'รายการเมื่อวาน' : 'รายการวันนี้'}
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">
            {targetDay === 'yesterday' ? 'ยังไม่มีการบันทึกเมื่อวาน' : 'ยังไม่มีการบันทึกวันนี้'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((log) => (
              <li
                key={log.client_id}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"
              >
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <ClockIcon className="h-4 w-4 text-slate-300" />
                  {new Date(log.logged_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {log.amount_ml} ml
                  {!log.id && <span className="ml-1 text-xs text-sun-400">(รอซิงค์)</span>}
                </span>
                <button
                  onClick={() => setPendingDelete(log)}
                  aria-label="ลบรายการนี้"
                  className="rounded-full p-1.5 text-coral-400 transition hover:bg-coral-100 hover:text-coral-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    ),
    pacing: (
      <PacingChecklist
        reminderStart={profile.reminder_start}
        reminderEnd={profile.reminder_end}
        dailyGoalMl={effectiveGoalMl}
        totalMlSoFar={effectiveTotalMl}
      />
    ),
    alcohol: alcoholEnabled ? (
      <AlcoholCard userId={user!.id} logDate={todayDate ?? todayInTimeZone(profile.timezone)} />
    ) : null,
    otherDrinks: (
      <OtherDrinksCard
        userId={user!.id}
        logDate={viewDate ?? todayInTimeZone(profile.timezone)}
        compensationRatio={profile.caffeine_compensation_ratio}
        onChange={() => viewDate && reloadOtherDrinksForDate(user!.id, viewDate)}
      />
    ),
    tip: todayDate ? (
      <div className="flex w-full max-w-sm items-start gap-3 rounded-3xl bg-white p-4 shadow-md shadow-water-100">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sun-300/40">
          <LightBulbIcon className="h-5 w-5 text-sun-400" />
        </span>
        <div>
          <p className="mb-0.5 text-xs font-semibold text-slate-500">เคล็ดลับวันนี้</p>
          <p className="text-sm text-slate-600">{getTipOfTheDay(todayDate)}</p>
        </div>
      </div>
    ) : null,
    challenge: (
      <ChallengeCard
        userId={user!.id}
        timezone={profile.timezone}
        dailyGoalMl={profile.daily_goal_ml}
        compensationRatio={profile.caffeine_compensation_ratio}
      />
    ),
  }

  const visibleWidgetOrder = widgetOrder.filter(
    (id) => !hiddenWidgets.includes(id) && (id !== 'alcohol' || alcoholEnabled) && widgetContent[id] !== null,
  )
  const addableWidgets = hiddenWidgets.filter((id) => id !== 'alcohol')

  return (
    <div className="flex min-h-full flex-col items-center gap-6 bg-water-50 px-6 py-10">
      {error && <p className="text-sm text-coral-500">{error}</p>}
      {backdateNotice && (
        <p className="w-full max-w-sm rounded-full bg-sun-300/40 px-4 py-2 text-center text-sm text-water-700">
          {backdateNotice}
        </p>
      )}

      {goalReached && (
        <div className="flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral-400 to-coral-500 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg shadow-coral-500/30">
          <CheckBadgeIcon className="h-5 w-5" />
          ครบเป้าหมายวันนี้แล้ว เก่งมาก!
        </div>
      )}

      {nearGoal && (
        <div className="flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-sun-300/50 px-4 py-2.5 text-center text-sm font-medium text-water-700 shadow-sm">
          <BoltIcon className="h-4 w-4 text-sun-400" />
          เหลืออีกแค่ {remainingMl.toLocaleString()} ml เท่านั้น ใกล้ถึงแล้ว!
        </div>
      )}

      {showMissQuip && todayDate && (
        <div className="flex w-full max-w-sm items-center gap-2 rounded-2xl bg-coral-100 px-4 py-3 text-xs text-coral-600">
          <FaceSmileIcon className="h-5 w-5 flex-shrink-0 text-coral-400" />
          {getMissDayQuip(todayDate)}
        </div>
      )}

      {lastAdded && (
        <div className="flex w-full max-w-sm items-center justify-between gap-2 rounded-full bg-water-700 px-4 py-2 text-sm text-white shadow-lg shadow-water-700/30">
          <span>เพิ่ม {lastAdded.amountMl.toLocaleString()} ml แล้ว</span>
          <button onClick={handleUndo} className="font-medium text-sun-300 hover:underline">
            เลิกทำ
          </button>
        </div>
      )}

      {targetDay === 'yesterday' && (
        <p className="w-full max-w-sm rounded-full bg-water-100 px-4 py-2 text-center text-xs font-medium text-water-700">
          กำลังดูข้อมูลของเมื่อวาน
        </p>
      )}

      <div className="relative">
        <WaveCircle
          percent={percent}
          label={`${effectiveTotalMl.toLocaleString()} / ${effectiveGoalMl.toLocaleString()} ml`}
          sublabel={
            viewGoalReached ? 'ดื่มเกินเป้าหมายก็ได้ ดื่มต่อได้เลย' : `เหลืออีก ${Math.max(effectiveGoalMl - effectiveTotalMl, 0)} ml`
          }
        />
        {streak > 0 && (
          <div className="absolute -left-2 -top-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-md shadow-water-100">
            <FireIcon className="h-4 w-4 text-coral-500" />
            <span className="font-display text-xs font-semibold text-coral-600">{streak} วัน</span>
          </div>
        )}
        <div className="absolute -right-2 -top-2">
          <RankBadge points={rankPoints} />
        </div>
        <div className="absolute -right-2 -bottom-2 flex items-center gap-2">
          <button
            onClick={() => navigate('/history')}
            aria-label="ดูประวัติย้อนหลัง"
            className="rounded-full bg-white p-2 text-water-500 shadow-md shadow-water-100 transition hover:bg-water-50"
          >
            <ChartBarIcon className="h-5 w-5" />
          </button>
          {targetDay === 'today' && (
            <button
              onClick={() => setShowSummary(true)}
              aria-label="สรุปวันนี้"
              className="rounded-full bg-white p-2 text-water-500 shadow-md shadow-water-100 transition hover:bg-water-50"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-sm gap-2 self-center">
        <button
          onClick={() => setTargetDay('today')}
          className={`flex-1 rounded-full py-1.5 text-xs font-medium transition ${
            targetDay === 'today' ? 'bg-water-500 text-white' : 'bg-white text-slate-400 shadow-sm'
          }`}
        >
          บันทึกวันนี้
        </button>
        <button
          onClick={() => setTargetDay('yesterday')}
          className={`flex-1 rounded-full py-1.5 text-xs font-medium transition ${
            targetDay === 'yesterday' ? 'bg-water-500 text-white' : 'bg-white text-slate-400 shadow-sm'
          }`}
        >
          บันทึกเมื่อวาน
        </button>
      </div>

      <div className="grid w-full max-w-sm grid-cols-3 gap-3">
        {quickAddOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleAdd(opt.amount)}
            className="flex flex-col items-center gap-1 rounded-3xl bg-white px-2 py-4 text-sm font-medium text-water-700 shadow-md shadow-water-100 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {opt.icon}
            {opt.label}
            <span className="text-xs font-normal text-slate-400">{opt.amount} ml</span>
          </button>
        ))}
        {presets.map((preset) => (
          <div key={preset.id} className="relative">
            <button
              onClick={() => handleAdd(preset.amountMl)}
              className="flex w-full flex-col items-center gap-1 rounded-3xl bg-white px-2 py-4 text-sm font-medium text-water-700 shadow-md shadow-water-100 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <GlassIcon className="h-8 w-8 text-water-500" fillPercent={60} />
              <span className="w-full truncate text-center">{preset.label}</span>
              <span className="text-xs font-normal text-slate-400">{preset.amountMl} ml</span>
            </button>
            <button
              onClick={() => handleRemovePreset(preset.id)}
              aria-label="ลบแก้วโปรด"
              className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 text-coral-400 shadow-sm shadow-water-100 transition hover:bg-coral-100 hover:text-coral-600"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-white px-2 py-4 text-sm font-medium text-water-700 shadow-md shadow-water-100 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <PlusIcon className="h-8 w-8 text-water-500" />
          กำหนดเอง
        </button>
      </div>

      {showCustom && (
        <div className="flex w-full max-w-sm flex-col gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAdd(customAmount ?? 0)
            }}
            className="flex gap-2"
          >
            <NumberField
              value={customAmount}
              nullable
              autoFocus
              placeholder="ปริมาณ (ml)"
              onChange={setCustomAmount}
              className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
            />
            <button
              type="submit"
              className="rounded-full bg-water-500 px-5 py-2.5 font-medium text-white transition hover:bg-water-600"
            >
              เพิ่ม
            </button>
          </form>

          {!showSavePreset ? (
            <button
              type="button"
              onClick={() => setShowSavePreset(true)}
              className="self-start text-xs text-water-600 hover:underline"
            >
              + บันทึกเป็นแก้วโปรด
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                placeholder="ชื่อแก้วโปรด เช่น แก้วเย็น"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                className="rounded-full bg-water-100 px-4 py-2 text-xs font-medium text-water-700 transition hover:bg-water-200"
              >
                บันทึก
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setEditLayout((v) => !v)}
        className={`flex items-center gap-1.5 self-center rounded-full px-4 py-1.5 text-xs font-medium transition ${
          editLayout ? 'bg-water-500 text-white shadow-md shadow-water-500/30' : 'bg-white text-slate-400 shadow-sm'
        }`}
      >
        {editLayout ? (
          <>
            <CheckIcon className="h-3.5 w-3.5" />
            เสร็จแล้ว
          </>
        ) : (
          <>
            <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
            จัดเรียงวิดเจ็ต
          </>
        )}
      </button>

      {editLayout && addableWidgets.length > 0 && (
        <div className="flex w-full max-w-sm flex-wrap justify-center gap-2">
          {addableWidgets.map((id) => (
            <button
              key={id}
              onClick={() => handleShowWidget(id)}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-water-600 shadow-sm shadow-water-100 transition hover:bg-water-50"
            >
              <PlusIcon className="h-3 w-3" />
              {WIDGET_LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {editLayout ? (
        <Reorder.Group
          as="div"
          axis="y"
          values={visibleWidgetOrder}
          onReorder={handleReorder}
          className="flex w-full max-w-sm flex-col gap-4"
        >
          {visibleWidgetOrder.map((id) => (
            <DraggableWidget key={id} id={id} onRemove={() => handleHideWidget(id)}>
              {widgetContent[id]}
            </DraggableWidget>
          ))}
        </Reorder.Group>
      ) : (
        <div className="flex w-full max-w-sm flex-col gap-4">
          {visibleWidgetOrder.map((id) => (
            <div key={id}>{widgetContent[id]}</div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="ลบรายการนี้?"
        description={pendingDelete ? `${pendingDelete.amount_ml} ml — ลบแล้วไม่สามารถกู้คืนได้` : undefined}
        confirmLabel="ลบ"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <DailySummaryModal
        open={showSummary}
        onClose={() => setShowSummary(false)}
        totalMl={effectiveTotalMl}
        goalMl={effectiveGoalMl}
        reminderStart={profile.reminder_start}
        reminderEnd={profile.reminder_end}
      />
    </div>
  )
}
