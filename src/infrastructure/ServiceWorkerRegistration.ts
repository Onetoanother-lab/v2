/**
 * INFRASTRUCTURE LAYER — Service Worker Registration
 *
 * Handles the full SW lifecycle:
 *   • Registration on app boot
 *   • Update detection + user prompt
 *   • Background sync registration
 *   • Install prompt capture for "Add to Home Screen"
 *
 * Called once from main.tsx after containerReady resolves.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PWAStatus {
  isInstalled:         boolean
  isInstallable:       boolean
  swRegistered:        boolean
  offlineReady:        boolean
  updateAvailable:     boolean
  notificationStatus:  NotificationPermission
}

// ─── Install prompt ───────────────────────────────────────────────────────────

let deferredInstallPrompt: any = null

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredInstallPrompt = event
  window.dispatchEvent(new CustomEvent('pwa:installable'))
})

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null
  window.dispatchEvent(new CustomEvent('pwa:installed'))
})

export async function promptInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false
  deferredInstallPrompt.prompt()
  const { outcome } = await deferredInstallPrompt.userChoice
  deferredInstallPrompt = null
  return outcome === 'accepted'
}

export function isInstallable(): boolean {
  return !!deferredInstallPrompt
}

export function isInstalledPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

// ─── Service Worker registration ──────────────────────────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',   // Always fetch SW from network, never from HTTP cache
    })

    console.info('[SW] Registered:', registration.scope)

    // ── Detect updates ────────────────────────────────────────────────────
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New content available — notify the app
          window.dispatchEvent(new CustomEvent('pwa:updateavailable', {
            detail: { registration },
          }))
        }

        if (newWorker.state === 'activated' && !navigator.serviceWorker.controller) {
          // First install — app is ready for offline use
          window.dispatchEvent(new CustomEvent('pwa:offlineready'))
        }
      })
    })

    // ── Periodic update check (every 60 minutes) ──────────────────────────
    setInterval(() => registration.update(), 60 * 60 * 1000)

    // ── Background sync registration (fires on connectivity restore) ──────
    if ('sync' in registration) {
      try {
        await (registration as any).sync.register('habit-sync')
      } catch {
        // Background sync not available (iOS, some Firefox) — silently ignore
      }
    }

    return registration
  } catch (error) {
    console.error('[SW] Registration failed:', error)
    return null
  }
}

/**
 * Tell the waiting SW to activate immediately (skips waiting phase).
 * Call this when the user clicks "Update" on the update toast.
 */
export function activatePendingUpdate(registration: ServiceWorkerRegistration): void {
  const waiting = registration.waiting
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }
}

/**
 * Collect current PWA status for display in Settings.
 */
export async function getPWAStatus(): Promise<PWAStatus> {
  const swRegistered = !!navigator.serviceWorker?.controller

  return {
    isInstalled:        isInstalledPWA(),
    isInstallable:      isInstallable(),
    swRegistered,
    offlineReady:       swRegistered,
    updateAvailable:    false,
    notificationStatus: 'Notification' in window ? Notification.permission : 'denied',
  }
}
