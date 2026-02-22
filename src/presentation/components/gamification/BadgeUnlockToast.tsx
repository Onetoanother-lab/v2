/**
 * PRESENTATION LAYER — BadgeUnlockToast
 *
 * Animated notification that appears when a new badge is unlocked.
 * Auto-dismisses after 4s. Stacks multiple badges.
 * Purely presentational — receives badges as props.
 */

import { useEffect, memo } from 'react'
import { createPortal }    from 'react-dom'
import { cn }              from '@presentation/styles/cn'
import { RARITY_STYLES }   from '@domain/services/GamificationEngine'
import type { Badge }      from '@domain/services/GamificationEngine'

interface BadgeUnlockToastProps {
  badges:    Badge[]
  onDismiss: () => void
}

export const BadgeUnlockToast = memo(function BadgeUnlockToast({
  badges,
  onDismiss,
}: BadgeUnlockToastProps) {
  useEffect(() => {
    if (!badges.length) return
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [badges, onDismiss])

  if (!badges.length) return null

  return createPortal(
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Badge unlocked notifications"
    >
      {badges.map((badge, i) => {
        const styles = RARITY_STYLES[badge.rarity]
        return (
          <div
            key={badge.id}
            className={cn(
              'flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-sm pointer-events-auto',
              'animate-in slide-in-from-right-4 fade-in duration-500',
              styles.bg, styles.ring,
            )}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="text-3xl leading-none">{badge.emoji}</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Badge Unlocked!
              </p>
              <p className={cn('text-sm font-bold', styles.text)}>{badge.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{badge.description}</p>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              className="ml-2 text-slate-300 hover:text-slate-500 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
})
