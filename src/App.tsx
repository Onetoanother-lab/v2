/**
 * App.tsx — Root Component (Phase 2)
 *
 * Added in Phase 2:
 *   • Global PWA banners (install, offline, update)
 *   • Badge unlock toast (persists across route changes)
 *   • Gamification bootstrap (trigger on initial load)
 *
 * Architecture note:
 *   App.tsx only orchestrates global shell concerns.
 *   PWA and gamification state live in hooks — not here.
 */

import { RouterProvider }        from 'react-router-dom'
import { router }                from '@presentation/pages/router'
import { useThemeInit }          from '@presentation/hooks/useThemeInit'
import { usePWA }                from '@presentation/hooks/usePWA'
import { useGamification }       from '@presentation/hooks/useGamification'
import { useRecentBadges }       from '@application/stores/gamificationStore'
import { BadgeUnlockToast }      from '@presentation/components/gamification/BadgeUnlockToast'
import {
  OfflineBanner,
  UpdateBanner,
} from '@presentation/components/pwa/PWABanners'
import { useGamificationStore }  from '@application/stores/gamificationStore'

function GlobalBanners() {
  const { isOnline, updateAvailable, applyUpdate, dismissUpdate } = usePWA()
  const recentBadges = useRecentBadges()
  const clearRecent  = useGamificationStore((s) => s.clearRecentlyUnlocked)

  return (
    <>
      {/* Offline indicator — only rendered when offline */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-2">
          <OfflineBanner isOnline={isOnline} />
        </div>
      )}

      {/* SW update toast */}
      {updateAvailable && (
        <div className="fixed top-4 right-4 z-50 w-80">
          <UpdateBanner
            updateAvailable={updateAvailable}
            onUpdate={applyUpdate}
            onDismiss={dismissUpdate}
          />
        </div>
      )}

      {/* Badge unlock celebration */}
      <BadgeUnlockToast
        badges={recentBadges}
        onDismiss={clearRecent}
      />
    </>
  )
}

export function App() {
  useThemeInit()

  return (
    <>
      <RouterProvider router={router} />
      <GlobalBanners />
    </>
  )
}
