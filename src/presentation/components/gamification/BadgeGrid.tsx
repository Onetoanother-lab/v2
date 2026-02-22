/**
 * PRESENTATION LAYER — BadgeGrid
 *
 * Displays earned badges in a grid. Locked badges shown as greyed silhouettes.
 * Purely presentational — receives badge data as props.
 */

import { memo } from 'react'
import { cn }            from '@presentation/styles/cn'
import { ALL_BADGES, RARITY_STYLES } from '@domain/services/GamificationEngine'
import type { Badge }    from '@domain/services/GamificationEngine'

interface BadgeGridProps {
  unlockedBadges: Badge[]
  showLocked?:    boolean
}

interface BadgeCardProps {
  badge:    Omit<Badge, 'unlockedAt'>
  unlocked: boolean
  date?:    string
}

const BadgeCard = memo(function BadgeCard({ badge, unlocked, date }: BadgeCardProps) {
  const styles = RARITY_STYLES[badge.rarity]

  return (
    <div
      title={unlocked ? `${badge.name} — ${badge.description}` : `🔒 ${badge.description}`}
      className={cn(
        'group relative flex flex-col items-center gap-1.5 rounded-2xl p-3 ring-1 transition-all duration-200',
        unlocked
          ? [styles.bg, styles.ring, 'cursor-default']
          : 'bg-slate-50 ring-slate-200 dark:bg-slate-800/50 dark:ring-slate-700 opacity-40 cursor-not-allowed',
        unlocked && 'hover:scale-105 hover:shadow-md',
      )}
    >
      {/* Rarity pip */}
      {unlocked && badge.rarity !== 'common' && (
        <span className={cn(
          'absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900',
          badge.rarity === 'legendary' ? 'bg-amber-400' :
          badge.rarity === 'epic'      ? 'bg-purple-400' : 'bg-blue-400',
        )} />
      )}

      {/* Emoji */}
      <span className={cn('text-2xl leading-none', !unlocked && 'grayscale')}>
        {unlocked ? badge.emoji : '🔒'}
      </span>

      {/* Name */}
      <span className={cn(
        'text-center text-[10px] font-semibold leading-tight',
        unlocked ? styles.text : 'text-slate-400',
      )}>
        {badge.name}
      </span>

      {/* Unlock date */}
      {unlocked && date && (
        <span className="text-[9px] text-slate-400 tabular-nums">
          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  )
})

export const BadgeGrid = memo(function BadgeGrid({
  unlockedBadges,
  showLocked = true,
}: BadgeGridProps) {
  const unlockedIds = new Set(unlockedBadges.map((b) => b.id))
  const unlockedMap = new Map(unlockedBadges.map((b) => [b.id, b]))

  const toShow = showLocked
    ? ALL_BADGES
    : ALL_BADGES.filter((b) => unlockedIds.has(b.id))

  // Group by rarity for display
  const byRarity = {
    legendary: toShow.filter((b) => b.rarity === 'legendary'),
    epic:      toShow.filter((b) => b.rarity === 'epic'),
    rare:      toShow.filter((b) => b.rarity === 'rare'),
    common:    toShow.filter((b) => b.rarity === 'common'),
  }

  const RARITY_LABELS: Record<string, string> = {
    legendary: '👑 Legendary',
    epic:      '🌟 Epic',
    rare:      '💎 Rare',
    common:    '✅ Common',
  }

  return (
    <div className="space-y-5">
      {(['legendary', 'epic', 'rare', 'common'] as const).map((rarity) => {
        const badges = byRarity[rarity]
        if (!badges.length) return null
        return (
          <div key={rarity}>
            <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {RARITY_LABELS[rarity]}
              <span className="ml-2 font-normal">
                ({badges.filter((b) => unlockedIds.has(b.id)).length}/{badges.length})
              </span>
            </h4>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {badges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlocked={unlockedIds.has(badge.id)}
                  date={unlockedMap.get(badge.id as any)?.unlockedAt}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
})
