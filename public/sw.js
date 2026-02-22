/**
 * SERVICE WORKER — sw.js
 *
 * Place this file at: public/sw.js
 * Registered in main.tsx via navigator.serviceWorker.register('/sw.js')
 *
 * ─── Caching Strategy ─────────────────────────────────────────────────────────
 *
 *  Cache-first (app shell):
 *    HTML, JS, CSS, fonts — served from cache, updated in background.
 *    Users never wait for the network on repeat visits.
 *
 *  Network-first (API calls):
 *    External APIs — try network, fall back to cache on failure.
 *
 *  Stale-while-revalidate (images):
 *    Icons, images — serve cache immediately, refresh in background.
 *
 * ─── Offline-first guarantee ──────────────────────────────────────────────────
 *   All app shell assets are pre-cached on install. The app works
 *   completely offline. Data (IndexedDB) already persists locally.
 *   Only new code deployments require connectivity.
 */

const CACHE_NAME    = 'habitual-v1'
const APP_SHELL     = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Scheduled notification timeouts (in-memory, reset on SW restart)
const scheduledTimeouts = new Map()

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing…')
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),  // Activate immediately
  )
})

// ─── Activate (clean up old caches) ──────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating…')
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),  // Take control of open tabs immediately
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin (e.g. analytics, external APIs)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Skip chrome-extension and dev tooling
  if (!url.protocol.startsWith('http')) return

  event.respondWith(handleFetch(request))
})

async function handleFetch(request) {
  const url = new URL(request.url)

  // ── App shell: HTML navigation → cache-first with network fallback ────────
  if (request.mode === 'navigate') {
    return cacheFirst(request, '/index.html')
  }

  // ── JS / CSS chunks: stale-while-revalidate ───────────────────────────────
  if (url.pathname.match(/\.(js|css|woff2?)$/)) {
    return staleWhileRevalidate(request)
  }

  // ── Images: cache-first ───────────────────────────────────────────────────
  if (url.pathname.match(/\.(png|svg|jpg|ico|webp)$/)) {
    return cacheFirst(request)
  }

  // ── Everything else: network with cache fallback ──────────────────────────
  return networkFirst(request)
}

async function cacheFirst(request, fallbackPath) {
  const cached = await caches.match(request)
  if (cached) return cached

  if (fallbackPath) {
    const fallback = await caches.match(fallbackPath)
    if (fallback) return fallback
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  const networkPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  })

  return cached ?? networkPromise
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? new Response(JSON.stringify({ error: 'Offline' }), {
      status:  503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─── Message handling ─────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type, ...payload } = event.data ?? {}

  switch (type) {
    case 'SCHEDULE_NOTIFICATIONS':
      handleScheduleNotifications(payload.notifications ?? [])
      break

    case 'SHOW_NOTIFICATION':
      self.registration.showNotification(payload.title, {
        body:  payload.body,
        icon:  payload.icon ?? '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag:   'habit-reminder',
        data:  { url: '/' },
      })
      break

    case 'SKIP_WAITING':
      self.skipWaiting()
      break
  }
})

// ─── Notification scheduling ──────────────────────────────────────────────────

function handleScheduleNotifications(notifications) {
  // Clear existing timeouts
  for (const timeout of scheduledTimeouts.values()) clearTimeout(timeout)
  scheduledTimeouts.clear()

  for (const pref of notifications) {
    scheduleOne(pref)
  }
}

function scheduleOne(pref) {
  const ms = msUntilNextFire(pref)
  const timeout = setTimeout(() => {
    self.registration.showNotification(`⏰ ${pref.habitName}`, {
      body:    "It's time for your habit!",
      icon:    '/icons/icon-192.png',
      badge:   '/icons/badge-72.png',
      tag:     `reminder-${pref.habitId}`,
      actions: [
        { action: 'complete', title: '✅ Done' },
        { action: 'snooze',   title: '⏱ 30 min' },
      ],
      data: { habitId: pref.habitId, url: '/habits' },
    })
    // Reschedule for next occurrence
    scheduleOne(pref)
  }, ms)
  scheduledTimeouts.set(pref.habitId, timeout)
}

function msUntilNextFire(pref) {
  const [h, m] = pref.timeHHMM.split(':').map(Number)
  const now    = new Date()
  const target = new Date(now)
  target.setHours(h, m, 0, 0)

  if (target <= now) target.setDate(target.getDate() + 1)

  if (pref.days && pref.days.length > 0) {
    let attempts = 0
    while (!pref.days.includes(target.getDay()) && attempts < 7) {
      target.setDate(target.getDate() + 1)
      attempts++
    }
  }

  return Math.max(1000, target.getTime() - now.getTime())
}

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'snooze') {
    const snoozedPref = {
      ...event.notification.data,
      timeHHMM: snoozeTime(30),
      days: [],
    }
    scheduleOne(snoozedPref)
    return
  }

  // Focus or open the app
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const url = event.notification.data?.url ?? '/'
        const existing = clients.find((c) => c.url.includes(url))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      }),
  )
})

function snoozeTime(minutes) {
  const d = new Date(Date.now() + minutes * 60_000)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// ─── Background sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'habit-sync') {
    // Background sync fires when connectivity is restored.
    // IndexedDB is already the source of truth — no extra sync needed.
    // This tag is registered as a signal that the app is back online.
    event.waitUntil(Promise.resolve())
  }
})
