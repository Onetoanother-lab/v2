/**
 * PRESENTATION LAYER — PWAInstallBanner
 *
 * Shown when the app is installable (beforeinstallprompt fired).
 * Hidden after install or manual dismissal (stored in sessionStorage).
 * Purely presentational — install logic in usePWA hook.
 */

import { useState, memo }  from 'react'
import { Download, X, Wifi } from 'lucide-react'
import { Button }           from '@presentation/components/ui/Button'
import { cn }               from '@presentation/styles/cn'

interface PWAInstallBannerProps {
  isInstallable: boolean
  isOnline:      boolean
  onInstall:     () => Promise<boolean>
}

export const PWAInstallBanner = memo(function PWAInstallBanner({
  isInstallable,
  isOnline,
  onInstall,
}: PWAInstallBannerProps) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('pwa-banner-dismissed') === '1',
  )
  const [installing, setInstalling] = useState(false)

  if (dismissed || !isInstallable) return null

  const dismiss = () => {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setDismissed(true)
  }

  const handleInstall = async () => {
    setInstalling(true)
    const accepted = await onInstall()
    setInstalling(false)
    if (accepted) dismiss()
  }

  return (
    <div className={cn(
      'card flex items-center gap-4 p-4',
      'border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-900/10',
    )}>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
        <Download size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Install Habitual
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Add to home screen for offline access and notifications
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button size="sm" onClick={handleInstall} isLoading={installing}>
          Install
        </Button>
        <button
          onClick={dismiss}
          aria-label="Dismiss install banner"
          className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
})

// ─── Offline Banner ───────────────────────────────────────────────────────────

interface OfflineBannerProps {
  isOnline: boolean
}

export const OfflineBanner = memo(function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null

  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
      <Wifi size={14} className="flex-shrink-0" />
      <span>You're offline. Your data is saved locally and will sync when reconnected.</span>
    </div>
  )
})

// ─── Update Banner ────────────────────────────────────────────────────────────

interface UpdateBannerProps {
  updateAvailable: boolean
  onUpdate:        () => void
  onDismiss:       () => void
}

export const UpdateBanner = memo(function UpdateBanner({
  updateAvailable,
  onUpdate,
  onDismiss,
}: UpdateBannerProps) {
  if (!updateAvailable) return null

  return (
    <div className="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm">
      <span className="text-lg">🆕</span>
      <p className="flex-1 text-blue-700 dark:text-blue-300">
        A new version of Habitual is available.
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onUpdate}>
          Update
        </Button>
        <button
          onClick={onDismiss}
          className="text-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Dismiss update"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
})
