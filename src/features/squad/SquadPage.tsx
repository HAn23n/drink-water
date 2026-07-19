import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  UserGroupIcon,
  LinkIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { LoadingScreen } from '../../components/LoadingScreen'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAuth } from '../../lib/AuthContext'
import { fetchProfile, type Profile } from '../../lib/profile'
import { todayInTimeZone } from '../../lib/water'
import { getRank } from '../../lib/rank'
import {
  createGroup,
  joinGroupByCode,
  fetchMyGroups,
  fetchGroupMembers,
  fetchGroupSnapshots,
  leaveGroup,
  type Group,
  type GroupMember,
  type GroupProgressSnapshot,
} from '../../lib/groups'

type ViewMode = 'daily' | 'weekly'

function daysAgo(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function lastSeenKey(groupId: string) {
  return `squad-lastseen-${groupId}`
}

function readLastSeen(groupId: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(lastSeenKey(groupId)) ?? '{}')
  } catch {
    return {}
  }
}

function writeLastSeen(groupId: string, data: Record<string, number>) {
  localStorage.setItem(lastSeenKey(groupId), JSON.stringify(data))
}

function lowestNotifiedKey(groupId: string) {
  return `squad-lowest-notified-${groupId}`
}

export function SquadPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [snapshots, setSnapshots] = useState<GroupProgressSnapshot[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [loading, setLoading] = useState(true)
  const [loadingGroup, setLoadingGroup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pendingLeave, setPendingLeave] = useState(false)

  const pendingJoinCode = searchParams.get('join')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      try {
        const [loadedProfile, myGroups] = await Promise.all([fetchProfile(user!.id), fetchMyGroups(user!.id)])
        if (cancelled) return
        setProfile(loadedProfile)
        setGroups(myGroups)
        if (myGroups.length > 0) setSelectedGroupId(myGroups[0].id)
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
  }, [user])

  const reloadGroupData = useCallback(
    async (groupId: string) => {
      if (!user || !profile) return
      setLoadingGroup(true)
      try {
        const today = todayInTimeZone(profile.timezone)
        const groupMembers = await fetchGroupMembers(groupId)
        const groupSnapshots = await fetchGroupSnapshots(
          groupMembers.map((m) => m.user_id),
          daysAgo(today, 6),
        )
        setMembers(groupMembers)
        setSnapshots(groupSnapshots)

        // Comparative nudges — computed locally from data the RLS already lets
        // this user read, so no server function is needed for this MVP.
        const todaySnapshots = groupSnapshots.filter((s) => s.log_date === today)
        const mySnapshot = todaySnapshots.find((s) => s.user_id === user.id)
        if (mySnapshot && todaySnapshots.length >= 2) {
          const lowestToday = todaySnapshots.reduce((min, s) => (s.percent_of_goal < min.percent_of_goal ? s : min))
          if (lowestToday.user_id === user.id) {
            const notifiedKey = lowestNotifiedKey(groupId)
            if (localStorage.getItem(notifiedKey) !== today) {
              localStorage.setItem(notifiedKey, today)
              setBanner('วันนี้คุณน้อยสุดในกลุ่มอยู่นะ ลุยเพิ่มอีกหน่อย!')
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('เพื่อนในกลุ่มดื่มนำอยู่!', {
                  body: 'วันนี้คุณน้อยสุดในกลุ่มอยู่นะ ลุยเพิ่มอีกหน่อย!',
                  icon: '/icons/icon-192.png',
                })
              }
            }
          }
        }

        const latestByUser = new Map<string, { logDate: string; points: number }>()
        for (const s of groupSnapshots) {
          const existing = latestByUser.get(s.user_id)
          if (!existing || s.log_date > existing.logDate) {
            latestByUser.set(s.user_id, { logDate: s.log_date, points: s.rank_points })
          }
        }
        const latestPointsByUser = new Map(Array.from(latestByUser, ([id, v]) => [id, v.points] as const))
        const myPoints = latestPointsByUser.get(user.id) ?? 0
        const lastSeen = readLastSeen(groupId)
        const nextSeen: Record<string, number> = { ...lastSeen }
        for (const member of groupMembers) {
          if (member.user_id === user.id) continue
          const theirPoints = latestPointsByUser.get(member.user_id) ?? 0
          const before = lastSeen[member.user_id] ?? 0
          if (before <= myPoints && theirPoints > myPoints) {
            setBanner(`${member.display_name} แซงคุณแล้ว! ไล่ตามคืนหน่อย`)
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('เพื่อนแซงคุณแล้ว!', {
                body: `${member.display_name} แซงคุณในแรงค์แล้ว ไล่ตามคืนหน่อย`,
                icon: '/icons/icon-192.png',
              })
            }
          }
          nextSeen[member.user_id] = theirPoints
        }
        writeLastSeen(groupId, nextSeen)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'โหลดข้อมูลกลุ่มไม่สำเร็จ')
      } finally {
        setLoadingGroup(false)
      }
    },
    [user, profile],
  )

  useEffect(() => {
    if (selectedGroupId) reloadGroupData(selectedGroupId)
  }, [selectedGroupId, reloadGroupData])

  async function handleCreate() {
    if (!user || !profile || !newGroupName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const group = await createGroup(user.id, profile.display_name, newGroupName.trim())
      setGroups((prev) => [...prev, group])
      setSelectedGroupId(group.id)
      setNewGroupName('')
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างกลุ่มไม่สำเร็จ')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(code: string) {
    if (!user) return
    setJoining(true)
    setError(null)
    try {
      const group = await joinGroupByCode(code)
      setGroups((prev) => (prev.some((g) => g.id === group.id) ? prev : [...prev, group]))
      setSelectedGroupId(group.id)
      setJoinCode('')
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('join')
        return next
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(
        message.includes('group_full')
          ? 'กลุ่มนี้เต็มแล้ว (สูงสุด 8 คน)'
          : message.includes('invalid_code')
            ? 'รหัสเชิญไม่ถูกต้อง'
            : 'เข้าร่วมกลุ่มไม่สำเร็จ',
      )
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    if (!user || !selectedGroupId) return
    setPendingLeave(false)
    try {
      await leaveGroup(selectedGroupId, user.id)
      const remaining = groups.filter((g) => g.id !== selectedGroupId)
      setGroups(remaining)
      setSelectedGroupId(remaining[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ออกจากกลุ่มไม่สำเร็จ')
    }
  }

  function handleCopyInvite(group: Group) {
    const link = `${window.location.origin}/squad?join=${group.invite_code}`
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const today = profile ? todayInTimeZone(profile.timezone) : null

  const leaderboard = useMemo(() => {
    if (!today) return []
    return members
      .map((member) => {
        const memberSnapshots = snapshots.filter((s) => s.user_id === member.user_id)
        const daily = memberSnapshots.find((s) => s.log_date === today)
        const weekAvg = memberSnapshots.length
          ? memberSnapshots.reduce((sum, s) => sum + s.percent_of_goal, 0) / memberSnapshots.length
          : 0
        const latestPoints = [...memberSnapshots].sort((a, b) => (a.log_date < b.log_date ? 1 : -1))[0]?.rank_points ?? 0
        return {
          member,
          dailyPercent: daily?.percent_of_goal ?? null,
          weeklyPercent: Math.round(weekAvg * 10) / 10,
          rank: getRank(latestPoints),
        }
      })
      .sort((a, b) => {
        const av = viewMode === 'daily' ? (a.dailyPercent ?? -1) : a.weeklyPercent
        const bv = viewMode === 'daily' ? (b.dailyPercent ?? -1) : b.weeklyPercent
        return bv - av
      })
  }, [members, snapshots, today, viewMode])

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  if (loading) return <LoadingScreen />

  return (
    <div className="flex min-h-full flex-col items-center gap-4 bg-water-50 px-6 py-10">
      {error && <p className="w-full max-w-sm text-sm text-coral-500">{error}</p>}
      {banner && (
        <div className="flex w-full max-w-sm items-center gap-2 rounded-2xl bg-sun-300/40 px-4 py-3 text-xs font-medium text-water-700">
          <TrophyIcon className="h-5 w-5 flex-shrink-0 text-sun-400" />
          {banner}
        </div>
      )}

      {pendingJoinCode && !groups.some((g) => g.invite_code === pendingJoinCode) && (
        <div className="w-full max-w-sm rounded-3xl border border-water-100 bg-white p-5 text-center shadow-md shadow-water-100">
          <p className="mb-3 text-sm text-slate-600">มีคนเชิญคุณเข้ากลุ่ม ต้องการเข้าร่วมไหม?</p>
          <button
            onClick={() => handleJoin(pendingJoinCode)}
            disabled={joining}
            className="w-full rounded-full bg-water-500 py-2.5 text-sm font-medium text-white transition hover:bg-water-600 disabled:opacity-50"
          >
            {joining ? 'กำลังเข้าร่วม...' : 'เข้าร่วมกลุ่ม'}
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-md shadow-water-100">
          <UserGroupIcon className="mx-auto mb-2 h-10 w-10 text-water-300" />
          <p className="mb-1 font-display text-lg font-semibold text-water-700">ยังไม่มีกลุ่ม</p>
          <p className="mb-4 text-sm text-slate-500">ชวนเพื่อน 6-8 คนมาแข่งดื่มน้ำกัน หรือเข้าร่วมกลุ่มที่มีอยู่แล้ว</p>

          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-medium text-slate-500">สร้างกลุ่มใหม่</label>
            <div className="flex gap-2">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="ชื่อกลุ่ม เช่น เพื่อนที่ทำงาน"
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newGroupName.trim()}
                className="rounded-full bg-water-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-water-600 disabled:opacity-50"
              >
                สร้าง
              </button>
            </div>

            <label className="mt-3 text-xs font-medium text-slate-500">มีรหัสเชิญ?</label>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="รหัสเชิญ"
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm uppercase outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
              />
              <button
                onClick={() => handleJoin(joinCode)}
                disabled={joining || !joinCode.trim()}
                className="rounded-full bg-water-100 px-4 py-2 text-sm font-medium text-water-700 transition hover:bg-water-200 disabled:opacity-50"
              >
                เข้าร่วม
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex w-full max-w-sm flex-wrap gap-2">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  g.id === selectedGroupId ? 'bg-water-500 text-white shadow-md shadow-water-500/30' : 'bg-white text-slate-500 shadow-sm'
                }`}
              >
                {g.name}
              </button>
            ))}
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-water-600 shadow-sm"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              เพิ่มกลุ่ม
            </button>
          </div>

          {showCreate && (
            <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-md shadow-water-100">
              <label className="text-xs font-medium text-slate-500">สร้างกลุ่มใหม่</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="ชื่อกลุ่ม"
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !newGroupName.trim()}
                  className="rounded-full bg-water-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-water-600 disabled:opacity-50"
                >
                  สร้าง
                </button>
              </div>
              <label className="mt-3 block text-xs font-medium text-slate-500">หรือมีรหัสเชิญ?</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="รหัสเชิญ"
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm uppercase outline-none transition focus:border-water-500 focus:ring-4 focus:ring-water-100"
                />
                <button
                  onClick={() => handleJoin(joinCode)}
                  disabled={joining || !joinCode.trim()}
                  className="rounded-full bg-water-100 px-4 py-2 text-sm font-medium text-water-700 transition hover:bg-water-200 disabled:opacity-50"
                >
                  เข้าร่วม
                </button>
              </div>
            </div>
          )}

          {selectedGroup && (
            <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-md shadow-water-100">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-water-700">{selectedGroup.name}</h2>
                <button
                  onClick={() => handleCopyInvite(selectedGroup)}
                  className="flex items-center gap-1 rounded-full bg-water-50 px-3 py-1.5 text-xs font-medium text-water-600 transition hover:bg-water-100"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  {copied ? 'คัดลอกแล้ว' : 'ชวนเพื่อน'}
                </button>
              </div>

              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`flex-1 rounded-full py-1.5 text-xs font-medium transition ${
                    viewMode === 'daily' ? 'bg-water-500 text-white' : 'bg-water-50 text-slate-400'
                  }`}
                >
                  วันนี้
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`flex-1 rounded-full py-1.5 text-xs font-medium transition ${
                    viewMode === 'weekly' ? 'bg-water-500 text-white' : 'bg-water-50 text-slate-400'
                  }`}
                >
                  สัปดาห์นี้
                </button>
              </div>

              <ul className={`flex flex-col gap-2 transition-opacity ${loadingGroup ? 'opacity-40' : ''}`}>
                {leaderboard.map(({ member, dailyPercent, weeklyPercent, rank }, i) => {
                  const percent = viewMode === 'daily' ? dailyPercent : weeklyPercent
                  const isSelf = member.user_id === user?.id
                  return (
                    <li
                      key={member.id}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${isSelf ? 'bg-water-50' : ''}`}
                    >
                      <span className="w-5 flex-shrink-0 text-center text-xs font-semibold text-slate-400">{i + 1}</span>
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${rank.bgClass} ${rank.toneClass}`}>
                        {member.display_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                        {member.display_name}
                        {isSelf && <span className="ml-1 text-xs text-water-500">(คุณ)</span>}
                      </span>
                      <span className="flex-shrink-0 text-sm font-semibold text-water-700">
                        {percent === null ? '—' : `${Math.round(percent)}%`}
                      </span>
                    </li>
                  )
                })}
              </ul>

              <button
                onClick={() => setPendingLeave(true)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-white py-2 text-xs font-medium text-coral-500 transition hover:bg-coral-50"
              >
                <ArrowRightOnRectangleIcon className="h-3.5 w-3.5" />
                ออกจากกลุ่ม
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingLeave}
        title="ออกจากกลุ่มนี้?"
        description="คุณจะไม่เห็นอันดับของกลุ่มนี้อีก แต่เข้าร่วมใหม่ได้ด้วยรหัสเชิญ"
        confirmLabel="ออกจากกลุ่ม"
        onConfirm={handleLeave}
        onCancel={() => setPendingLeave(false)}
      />
    </div>
  )
}
