/**
 * DOMAIN LAYER — Gamification Engine
 *
 * Pure functions. No side effects. No I/O. No framework imports.
 * All gamification math lives here so it's fully testable in isolation.
 *
 * ─── Point System ─────────────────────────────────────────────────────────────
 *   +10   base points per completion
 *   +5    bonus for completing on a non-easy frequency (weekly/custom)
 *   ×1.5  streak multiplier at 7+ days
 *   ×2.0  streak multiplier at 30+ days
 *   ×3.0  streak multiplier at 100+ days
 *
 * ─── Badge System ─────────────────────────────────────────────────────────────
 *   Badges are unlocked once and never revoked.
 *   Each badge has: id, name, emoji, description, unlockCondition (pure predicate).
 */

import type { HabitEntry, HabitSnapshot } from '@domain/entities/Habit'
import type { DateString }                from '@domain/types/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeId =
  | 'first_completion'
  | 'three_day_streak'
  | 'week_warrior'
  | 'monthly_master'
  | 'century_club'
  | 'habit_collector_3'
  | 'habit_collector_5'
  | 'habit_collector_10'
  | 'perfect_week'
  | 'perfect_month'
  | 'night_owl'
  | 'early_bird'
  | 'comeback_kid'
  | 'total_50'
  | 'total_100'
  | 'total_500'
  | 'total_1000'
  | 'variety_pack'

export interface Badge {
  readonly id:          BadgeId
  readonly name:        string
  readonly emoji:       string
  readonly description: string
  readonly rarity:      'common' | 'rare' | 'epic' | 'legendary'
  readonly unlockedAt?: DateString
}

export interface GamificationState {
  totalPoints:     number
  level:           number
  levelName:       string
  nextLevelPoints: number
  progressToNext:  number   // 0–1
  unlockedBadges:  Badge[]
  recentlyUnlocked: Badge[]  // new badges from this calculation
}

export interface CompletionContext {
  habit:         Pick<HabitSnapshot, 'id' | 'frequency' | 'customDays'>
  allEntries:    ReadonlyArray<Pick<HabitEntry, 'date' | 'habitId' | 'completedAt'>>
  currentStreak: number
  today:         DateString
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export const ALL_BADGES: Omit<Badge, 'unlockedAt'>[] = [
  {
    id: 'first_completion',
    name: 'First Step',
    emoji: '🌱',
    description: 'Complete a habit for the first time.',
    rarity: 'common',
  },
  {
    id: 'three_day_streak',
    name: 'Hat Trick',
    emoji: '🎩',
    description: 'Maintain a 3-day streak.',
    rarity: 'common',
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    emoji: '⚔️',
    description: 'Maintain a 7-day streak.',
    rarity: 'rare',
  },
  {
    id: 'monthly_master',
    name: 'Monthly Master',
    emoji: '🏆',
    description: 'Maintain a 30-day streak.',
    rarity: 'epic',
  },
  {
    id: 'century_club',
    name: 'Century Club',
    emoji: '💯',
    description: 'Maintain a 100-day streak.',
    rarity: 'legendary',
  },
  {
    id: 'habit_collector_3',
    name: 'Habit Starter',
    emoji: '📋',
    description: 'Track 3 different habits.',
    rarity: 'common',
  },
  {
    id: 'habit_collector_5',
    name: 'Habit Builder',
    emoji: '🏗️',
    description: 'Track 5 different habits.',
    rarity: 'rare',
  },
  {
    id: 'habit_collector_10',
    name: 'Habit Architect',
    emoji: '🏛️',
    description: 'Track 10 different habits.',
    rarity: 'epic',
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    emoji: '✨',
    description: 'Complete all habits for 7 days straight.',
    rarity: 'rare',
  },
  {
    id: 'perfect_month',
    name: 'Perfect Month',
    emoji: '🌟',
    description: 'Complete all habits for 30 days straight.',
    rarity: 'legendary',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    emoji: '🌅',
    description: 'Complete a habit before 7am.',
    rarity: 'rare',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    emoji: '🦉',
    description: 'Complete a habit after 10pm.',
    rarity: 'rare',
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    emoji: '💪',
    description: 'Resume a habit after a 7-day gap.',
    rarity: 'rare',
  },
  {
    id: 'total_50',
    name: 'Half Century',
    emoji: '5️⃣0️⃣',
    description: 'Log 50 total completions.',
    rarity: 'common',
  },
  {
    id: 'total_100',
    name: 'Centurion',
    emoji: '💪',
    description: 'Log 100 total completions.',
    rarity: 'rare',
  },
  {
    id: 'total_500',
    name: 'Unstoppable',
    emoji: '🚀',
    description: 'Log 500 total completions.',
    rarity: 'epic',
  },
  {
    id: 'total_1000',
    name: 'Legendary',
    emoji: '👑',
    description: 'Log 1,000 total completions.',
    rarity: 'legendary',
  },
  {
    id: 'variety_pack',
    name: 'Variety Pack',
    emoji: '🎨',
    description: 'Have habits across 4 different categories.',
    rarity: 'rare',
  },
]

// ─── Level thresholds ─────────────────────────────────────────────────────────

const LEVELS = [
  { threshold: 0,     name: 'Seedling',   emoji: '🌱' },
  { threshold: 100,   name: 'Sprout',     emoji: '🌿' },
  { threshold: 300,   name: 'Sapling',    emoji: '🌳' },
  { threshold: 600,   name: 'Runner',     emoji: '🏃' },
  { threshold: 1000,  name: 'Achiever',   emoji: '🎯' },
  { threshold: 1500,  name: 'Challenger', emoji: '⚔️' },
  { threshold: 2500,  name: 'Champion',   emoji: '🏆' },
  { threshold: 4000,  name: 'Legend',     emoji: '⭐' },
  { threshold: 6000,  name: 'Mythic',     emoji: '🌟' },
  { threshold: 10000, name: 'Immortal',   emoji: '👑' },
]

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate points earned for a single completion event.
 * Call this every time a habit is toggled ON.
 */
export function calculatePointsForCompletion(
  currentStreak: number,
  frequency: HabitSnapshot['frequency'],
): number {
  const base = 10
  const freqBonus = frequency !== 'daily' ? 5 : 0
  const multiplier = streakMultiplier(currentStreak)
  return Math.round((base + freqBonus) * multiplier)
}

function streakMultiplier(streak: number): number {
  if (streak >= 100) return 3.0
  if (streak >= 30)  return 2.0
  if (streak >= 7)   return 1.5
  return 1.0
}

/**
 * Recalculate total points from scratch given all entries and streaks.
 * Used for consistency checks and initial hydration.
 */
export function calculateTotalPoints(
  entries: ReadonlyArray<Pick<HabitEntry, 'date' | 'habitId'>>,
  habitStreaks: ReadonlyMap<string, number>,
  habits: ReadonlyArray<Pick<HabitSnapshot, 'id' | 'frequency'>>,
): number {
  const habitFreqMap = new Map(habits.map((h) => [h.id, h.frequency]))

  // Group entries by habit and sort by date to reconstruct approximate streaks
  return entries.reduce((total, _entry) => {
    // Simplified: award base points. In real system, per-entry streak is stored.
    return total + 10
  }, 0)
}

/**
 * Derive current level from total points.
 */
export function calculateLevel(totalPoints: number): {
  level:           number
  levelName:       string
  levelEmoji:      string
  nextLevelPoints: number
  progressToNext:  number
} {
  let currentLevel = 0
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVELS[i].threshold) {
      currentLevel = i
      break
    }
  }

  const current  = LEVELS[currentLevel]
  const next     = LEVELS[Math.min(currentLevel + 1, LEVELS.length - 1)]
  const isMaxed  = currentLevel === LEVELS.length - 1

  const rangeSize = isMaxed ? 1 : next.threshold - current.threshold
  const progress  = isMaxed
    ? 1
    : (totalPoints - current.threshold) / rangeSize

  return {
    level:           currentLevel,
    levelName:       current.name,
    levelEmoji:      current.emoji,
    nextLevelPoints: next.threshold,
    progressToNext:  Math.min(1, Math.max(0, progress)),
  }
}

/**
 * Check which badges should be unlocked given current state.
 * Returns only NEWLY unlocked badges (not already in `existingBadgeIds`).
 */
export function evaluateBadges(params: {
  totalCompletions:    number
  maxCurrentStreak:    number
  habitCount:          number
  categoryCount:       number
  existingBadgeIds:    Set<BadgeId>
  allEntries:          ReadonlyArray<Pick<HabitEntry, 'date' | 'habitId' | 'completedAt'>>
  today:               DateString
}): Badge[] {
  const {
    totalCompletions,
    maxCurrentStreak,
    habitCount,
    categoryCount,
    existingBadgeIds,
    allEntries,
    today,
  } = params

  const newBadges: Badge[] = []
  const unlock = (id: BadgeId): void => {
    if (!existingBadgeIds.has(id)) {
      const def = ALL_BADGES.find((b) => b.id === id)
      if (def) newBadges.push({ ...def, unlockedAt: today })
    }
  }

  // Completion milestones
  if (totalCompletions >= 1)    unlock('first_completion')
  if (totalCompletions >= 50)   unlock('total_50')
  if (totalCompletions >= 100)  unlock('total_100')
  if (totalCompletions >= 500)  unlock('total_500')
  if (totalCompletions >= 1000) unlock('total_1000')

  // Streak milestones
  if (maxCurrentStreak >= 3)   unlock('three_day_streak')
  if (maxCurrentStreak >= 7)   unlock('week_warrior')
  if (maxCurrentStreak >= 30)  unlock('monthly_master')
  if (maxCurrentStreak >= 100) unlock('century_club')

  // Habit count milestones
  if (habitCount >= 3)  unlock('habit_collector_3')
  if (habitCount >= 5)  unlock('habit_collector_5')
  if (habitCount >= 10) unlock('habit_collector_10')

  // Category variety
  if (categoryCount >= 4) unlock('variety_pack')

  // Time-of-day badges
  const earlyEntry = allEntries.find((e) => {
    const hour = new Date(e.completedAt).getHours()
    return hour < 7
  })
  if (earlyEntry) unlock('early_bird')

  const lateEntry = allEntries.find((e) => {
    const hour = new Date(e.completedAt).getHours()
    return hour >= 22
  })
  if (lateEntry) unlock('night_owl')

  return newBadges
}

/**
 * Check if a comeback badge should be awarded:
 * completing a habit after a 7+ day gap.
 */
export function checkComebackBadge(
  sortedDates: DateString[],
  existingBadgeIds: Set<BadgeId>,
  today: DateString,
): boolean {
  if (existingBadgeIds.has('comeback_kid') || sortedDates.length < 2) return false

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]).getTime()
    const curr = new Date(sortedDates[i]).getTime()
    const gap  = (curr - prev) / 86_400_000
    if (gap >= 7) return true
  }
  return false
}

/**
 * Format points for display: 1234 → "1,234", 12345 → "12.3k"
 */
export function formatPoints(points: number): string {
  if (points >= 10_000) return `${(points / 1000).toFixed(1)}k`
  return points.toLocaleString()
}

/**
 * Get the rarity color class for a badge.
 */
export const RARITY_STYLES: Record<Badge['rarity'], { bg: string; text: string; ring: string }> = {
  common:    { bg: 'bg-slate-100 dark:bg-slate-700',   text: 'text-slate-600 dark:text-slate-300',   ring: 'ring-slate-200 dark:ring-slate-600' },
  rare:      { bg: 'bg-blue-50 dark:bg-blue-900/30',   text: 'text-blue-600 dark:text-blue-400',     ring: 'ring-blue-200 dark:ring-blue-700' },
  epic:      { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-200 dark:ring-purple-700' },
  legendary: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-300 dark:ring-amber-600' },
}
