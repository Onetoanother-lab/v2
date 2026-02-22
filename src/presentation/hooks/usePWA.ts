/**
 * PRESENTATION LAYER — usePWA Hook
 *
 * Exposes PWA capabilities to UI components:
 *   • Install prompt
 *   • Update available toast
 *   • Offline/online status
 *   • Notification permission
 *
 * Never imports from domain. Pure presentation orchestration.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  promptInstall,
  isInstalledPWA,
  isInstallable,
  activatePendingUpdate,
} from '@infrastructure/ServiceWorkerRegistration'
import {
  requestNotificationPermission,
  getNotificationPermission,
  syncScheduleWithServiceWorker,
} from '@infrastructure/NotificationService'

interface PWAState {
  isInstalled:        boolean
  isInstallable:      boolean
  isOnline:           boolean
  offlineReady:       boolean
  updateAvailable:    boolean
  pendingRegistration: ServiceWorkerRegistration | null
  notificationPerm:   NotificationPermission
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled:         isInstalledPWA(),
    isInstallable:       isInstallable(),
    isOnline:            navigator.onLine,
    offlineReady:        false,
    updateAvailable:     false,
    pendingRegistration: null,
    notificationPerm:    getNotificationPermission(),
  })

  useEffect(() => {
    const onOnline  = () => setState((s) => ({ ...s, isOnline: true }))
    const onOffline = () => setState((s) => ({ ...s, isOnline: false }))
    const onInstallable = () => setState((s) => ({ ...s, isInstallable: true }))
    const onInstalled   = () => setState((s) => ({ ...s, isInstalled: true, isInstallable: false }))
    const onOfflineReady = () => setState((s) => ({ ...s, offlineReady: true }))
    const onUpdate = (e: Event) => {
      const reg = (e as CustomEvent).detail?.registration as ServiceWorkerRegistration
      setState((s) => ({ ...s, updateAvailable: true, pendingRegistration: reg }))
    }

    window.addEventListener('online',              onOnline)
    window.addEventListener('offline',             onOffline)
    window.addEventListener('pwa:installable',     onInstallable)
    window.addEventListener('pwa:installed',       onInstalled)
    window.addEventListener('pwa:offlineready',    onOfflineReady)
    window.addEventListener('pwa:updateavailable', onUpdate)

    return () => {
      window.removeEventListener('online',              onOnline)
      window.removeEventListener('offline',             onOffline)
      window.removeEventListener('pwa:installable',     onInstallable)
      window.removeEventListener('pwa:installed',       onInstalled)
      window.removeEventListener('pwa:offlineready',    onOfflineReady)
      window.removeEventListener('pwa:updateavailable', onUpdate)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    const accepted = await promptInstall()
    if (accepted) setState((s) => ({ ...s, isInstalled: true, isInstallable: false }))
    return accepted
  }, [])

  const handleUpdate = useCallback(() => {
    if (state.pendingRegistration) {
      activatePendingUpdate(state.pendingRegistration)
    }
  }, [state.pendingRegistration])

  const handleRequestNotifications = useCallback(async () => {
    const perm = await requestNotificationPermission()
    setState((s) => ({ ...s, notificationPerm: perm }))
    if (perm === 'granted') await syncScheduleWithServiceWorker()
    return perm
  }, [])

  return {
    ...state,
    install:              handleInstall,
    applyUpdate:          handleUpdate,
    requestNotifications: handleRequestNotifications,
    dismissUpdate:        () => setState((s) => ({ ...s, updateAvailable: false })),
  }
}
