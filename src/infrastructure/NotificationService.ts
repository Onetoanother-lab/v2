/**
 * INFRASTRUCTURE LAYER — Notification Service
 *
 * Handles Web Push API and Notification API scheduling.
 * Isolated in infrastructure so application layer stays clean.
 *
 * ─── Capabilities ─────────────────────────────────────────────────────────────
 * 1. Request notification permission
 * 2. Schedule local (non-push) notifications via service worker
 * 3. Cancel scheduled notifications
 * 4. Store notification preferences in localStorage
 *
 * Limitations:
 *   • True push requires a push server (VAPID keys). We implement
 *     "local scheduled notifications" via the SW alarm pattern instead —
 *     fully functional offline with no backend needed.
 */

export interface NotificationPreference {
  habitId:    string
  habitName:  string
  timeHHMM:   string   // "08:30"
  enabled:    boolean
  days:       number[] // 0=Sun … 6=Sat, empty = every day
}

const PREFS_KEY = 'habit-tracker:notification-prefs'

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

// ─── Preferences persistence ──────────────────────────────────────────────────

export function loadNotificationPrefs(): NotificationPreference[] {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveNotificationPref(pref: NotificationPreference): void {
  const prefs = loadNotificationPrefs()
  const idx   = prefs.findIndex((p) => p.habitId === pref.habitId)
  if (idx >= 0) prefs[idx] = pref
  else prefs.push(pref)
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function removeNotificationPref(habitId: string): void {
  const prefs = loadNotificationPrefs().filter((p) => p.habitId !== habitId)
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

// ─── Service Worker messaging ─────────────────────────────────────────────────

/**
 * Send updated notification schedule to the service worker.
 * The SW stores them and uses the 'periodicsync' or setTimeout pattern
 * to fire reminders even when the app tab is closed.
 */
export async function syncScheduleWithServiceWorker(): Promise<void> {
  if (!navigator.serviceWorker?.controller) return

  const prefs = loadNotificationPrefs().filter((p) => p.enabled)
  navigator.serviceWorker.controller.postMessage({
    type:          'SCHEDULE_NOTIFICATIONS',
    notifications: prefs,
  })
}

/**
 * Show an immediate local notification (for testing / achievement unlocks).
 */
export function showLocalNotification(title: string, body: string, icon = '/icons/icon-192.png'): void {
  if (Notification.permission !== 'granted') return

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type:  'SHOW_NOTIFICATION',
      title,
      body,
      icon,
    })
  } else {
    new Notification(title, { body, icon })
  }
}

// ─── Next fire time calculation ────────────────────────────────────────────────

/**
 * Given a pref, calculate ms until the next scheduled notification.
 * Used by the SW to set a precise timeout.
 */
export function msUntilNextFire(pref: NotificationPreference): number {
  const [h, m]  = pref.timeHHMM.split(':').map(Number)
  const now      = new Date()
  const target   = new Date(now)

  target.setHours(h, m, 0, 0)

  // If we're past the target time today, advance to tomorrow
  if (target <= now) target.setDate(target.getDate() + 1)

  // If days are specified, find the next matching weekday
  if (pref.days.length > 0) {
    let attempts = 0
    while (!pref.days.includes(target.getDay()) && attempts < 7) {
      target.setDate(target.getDate() + 1)
      attempts++
    }
  }

  return target.getTime() - now.getTime()
}
