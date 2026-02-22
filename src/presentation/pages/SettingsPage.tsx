/**
 * PRESENTATION LAYER — SettingsPage
 *
 * Full settings page:
 *   • PWA install / update status
 *   • Notification scheduling per habit
 *   • Theme preference
 *   • Gamification reset (nuclear option)
 */

import { useEffect, useState } from 'react'
import { Bell, BellOff, Download, Sun, Moon, Monitor, Trash2, Shield } from 'lucide-react'
import { usePWA }             from '@presentation/hooks/usePWA'
import { useGamification }    from '@presentation/hooks/useGamification'
import { useHabits }          from '@presentation/hooks/useHabits'
import { useUIStore }         from '@application/stores/uiStore'
import { useGamificationStore } from '@application/stores/gamificationStore'
import { Button }             from '@presentation/components/ui/Button'
import { cn }                 from '@presentation/styles/cn'
import {
  loadNotificationPrefs,
  saveNotificationPref,
  syncScheduleWithServiceWorker,
} from '@infrastructure/NotificationService'
import type { NotificationPreference } from '@infrastructure/NotificationService'

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
      <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Row({ label, description, action }: { label: string; description?: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  )
}

// ─── Notification row per habit ────────────────────────────────────────────────

function HabitNotificationRow({
  habit,
  pref,
  onSave,
}: {
  habit: any
  pref?: NotificationPreference
  onSave: (pref: NotificationPreference) => void
}) {
  const [enabled, setEnabled] = useState(pref?.enabled ?? false)
  const [time,    setTime]    = useState(pref?.timeHHMM ?? '08:00')

  const handleToggle = () => {
    const next = !enabled
    setEnabled(next)
    onSave({ habitId: habit.id, habitName: habit.name, timeHHMM: time, enabled: next, days: [] })
  }

  const handleTimeChange = (t: string) => {
    setTime(t)
    if (enabled) onSave({ habitId: habit.id, habitName: habit.name, timeHHMM: t, enabled, days: [] })
  }

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base" role="img" aria-hidden>{habit.icon ?? '✅'}</span>
        <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{habit.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {enabled && (
          <input
            type="time"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        )}
        <button
          onClick={handleToggle}
          aria-label={enabled ? 'Disable notification' : 'Enable notification'}
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors duration-200',
            enabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700',
          )}
        >
          <span className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            enabled && 'translate-x-5',
          )} />
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { isInstalled, isInstallable, isOnline, notificationPerm, install, requestNotifications } = usePWA()
  const { habits, fetchHabits } = useHabits()
  const { theme, setTheme }     = useUIStore()
  const reset                   = useGamificationStore((s) => s.reset)
  const { totalPoints, unlockedBadges } = useGamification()

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference[]>([])
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    fetchHabits()
    setNotifPrefs(loadNotificationPrefs())
  }, [fetchHabits])

  const handleSavePref = (pref: NotificationPreference) => {
    saveNotificationPref(pref)
    setNotifPrefs(loadNotificationPrefs())
    syncScheduleWithServiceWorker()
  }

  const handleReset = () => {
    reset()
    setShowResetConfirm(false)
  }

  const THEMES = [
    { value: 'light',  label: 'Light',  icon: Sun },
    { value: 'dark',   label: 'Dark',   icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-sm text-slate-400 mt-0.5">Customize your Habitual experience</p>
      </div>

      {/* ── App & PWA ────────────────────────────────────────────────────── */}
      <Section title="App">
        <Row
          label="Install App"
          description={
            isInstalled
              ? 'Habitual is installed on your device'
              : 'Add to home screen for offline access'
          }
          action={
            isInstalled ? (
              <span className="text-xs text-brand-500 font-semibold">✓ Installed</span>
            ) : isInstallable ? (
              <Button size="sm" onClick={install}>
                <Download size={13} /> Install
              </Button>
            ) : (
              <span className="text-xs text-slate-400">Not available</span>
            )
          }
        />
        <Row
          label="Connection"
          description="Your data is stored locally — works offline"
          action={
            <span className={cn('flex items-center gap-1.5 text-xs font-semibold', isOnline ? 'text-brand-500' : 'text-amber-500')}>
              <span className={cn('h-2 w-2 rounded-full', isOnline ? 'bg-brand-500' : 'bg-amber-400')} />
              {isOnline ? 'Online' : 'Offline'}
            </span>
          }
        />
      </Section>

      {/* ── Appearance ───────────────────────────────────────────────────── */}
      <Section title="Appearance">
        <div className="px-5 py-4">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">Theme</p>
          <div className="flex gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all',
                  theme === value
                    ? 'border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700',
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <Section title="Notifications">
        {notificationPerm !== 'granted' ? (
          <div className="px-5 py-5 flex flex-col items-center gap-3 text-center">
            <Bell size={24} className="text-slate-300 dark:text-slate-600" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Enable reminders
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Get notified when it's time to complete your habits
              </p>
            </div>
            <Button size="sm" onClick={requestNotifications}>
              <Bell size={13} /> Allow Notifications
            </Button>
          </div>
        ) : habits.length === 0 ? (
          <div className="px-5 py-4 text-sm text-slate-400 text-center">
            Add habits to configure reminders
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {habits.map((h: any) => (
              <HabitNotificationRow
                key={h.id}
                habit={h}
                pref={notifPrefs.find((p) => p.habitId === h.id)}
                onSave={handleSavePref}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Gamification ─────────────────────────────────────────────────── */}
      <Section title="Progress">
        <Row
          label="Points earned"
          description={`${unlockedBadges.length} badges unlocked`}
          action={
            <span className="text-sm font-bold text-amber-500 tabular-nums">
              {totalPoints.toLocaleString()} XP
            </span>
          }
        />
        <Row
          label="Reset progress"
          description="Permanently clears all points and badges"
          action={
            showResetConfirm ? (
              <div className="flex items-center gap-2">
                <button onClick={handleReset} className="text-xs font-semibold text-red-500 hover:text-red-600">
                  Confirm reset
                </button>
                <button onClick={() => setShowResetConfirm(false)} className="text-xs text-slate-400">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-500 transition-colors font-medium"
              >
                <Trash2 size={12} /> Reset
              </button>
            )
          }
        />
      </Section>

      {/* ── About ────────────────────────────────────────────────────────── */}
      <Section title="About">
        <Row
          label="Version"
          description="Offline-first PWA"
          action={<span className="text-xs text-slate-400 font-mono">v1.0.0</span>}
        />
        <Row
          label="Data storage"
          description="All data stored locally via IndexedDB"
          action={<Shield size={14} className="text-brand-500" />}
        />
      </Section>

    </div>
  )
}
