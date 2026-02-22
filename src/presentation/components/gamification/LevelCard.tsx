/**
 * PRESENTATION LAYER — LevelCard + PointsChip
 *
 * Two display variants:
 *   LevelCard  — full card with XP bar (for sidebar/dashboard)
 *   PointsChip — compact inline display (for topbar)
 *
 * Both are purely presentational — receive data as props.
 */

import { memo } from 'react'
import { cn }   from '@presentation/styles/cn'
import { formatPoints } from '@domain/services/GamificationEngine'

// ─── PointsChip — compact ─────────────────────────────────────────────────────

interface PointsChipProps {
  points:    number
  levelEmoji: string
  levelName: string
  className?: string
}

export const PointsChip = memo(function PointsChip({
  points,
  levelEmoji,
  levelName,
  className,
}: PointsChipProps) {
  return (
    <div
      title={`${levelName} — ${formatPoints(points)} XP`}
      className={cn(
        'flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1',
        'dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
        className,
      )}
    >
      <span className="text-sm leading-none">{levelEmoji}</span>
      <span className="text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">
        {formatPoints(points)}
      </span>
      <span className="text-xs text-amber-500 dark:text-amber-500">XP</span>
    </div>
  )
})

// ─── LevelCard — full ─────────────────────────────────────────────────────────

interface LevelCardProps {
  level:           number
  levelName:       string
  levelEmoji:      string
  totalPoints:     number
  nextLevelPoints: number
  progressToNext:  number   // 0–1
  className?:      string
}

export const LevelCard = memo(function LevelCard({
  level,
  levelName,
  levelEmoji,
  totalPoints,
  nextLevelPoints,
  progressToNext,
  className,
}: LevelCardProps) {
  const isMaxLevel = level >= 9

  return (
    <div className={cn('card p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{levelEmoji}</span>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Level {level}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{levelName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Total XP</p>
          <p className="text-sm font-bold tabular-nums text-amber-500">
            {formatPoints(totalPoints)}
          </p>
        </div>
      </div>

      {/* XP Progress bar */}
      {!isMaxLevel && (
        <div className="space-y-1">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
            role="progressbar"
            aria-valuenow={Math.round(progressToNext * 100)}
            aria-valuemax={100}
            aria-label="Level progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
              style={{ width: `${progressToNext * 100}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-slate-400 tabular-nums">
            {formatPoints(nextLevelPoints - totalPoints)} XP to next level
          </p>
        </div>
      )}

      {isMaxLevel && (
        <p className="text-xs text-center text-amber-500 font-semibold">
          👑 Maximum level reached!
        </p>
      )}
    </div>
  )
})
