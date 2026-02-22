/**
 * DOMAIN LAYER — StreakCalculator
 *
 * Pure functions — no side effects, no I/O, no framework deps.
 * Input: a sorted array of completion DateStrings + the habit's frequency strategy.
 * Output: HabitStreak view model.
 *
 * ─── Key Design Decisions ────────────────────────────────────────────────────
 *
 * SRP:  This service only calculates streaks. Fetching entries is the repo's job.
 *
 * Frequency-awareness:
 *   • Daily  → consecutive calendar days required
 *   • Weekly → consecutive ISO weeks required (any completion in the week counts)
 *   • Custom → consecutive *scheduled* days required (skips non-scheduled days)
 *
 * Immutability: all inputs treated as read-only, all outputs are new objects.
 */

import type { HabitEntry, HabitSnapshot, HabitStreak } from '@domain/entities/Habit'
import type { DateString } from '@domain/types/shared'
import { FrequencyStrategyFactory } from '@domain/services/FrequencyStrategy'
import {
  daysBetween,
  addDays,
  isoWeekKey,
  isSameISOWeek,
  todayUTC,
  formatDate,
} from '@domain/services/DateUtils'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Reduce a list of completion dates to unique "period keys":
 *   • daily   → the date itself  (YYYY-MM-DD)
 *   • weekly  → ISO week key     (YYYY-Www)
 *   • custom  → the date itself  (only scheduled days will be in the list)
 */
function toPeriodKeys(
  sortedDates: DateString[],
  frequency: HabitSnapshot['frequency'],
): string[] {
  const keys = sortedDates.map((d) =>
    frequency === 'weekly' ? isoWeekKey(d) : d,
  )
  // Deduplicate (multiple completions in same period → one key)
  return [...new Set(keys)]
}

/**
 * Given an ordered list of unique period keys, compute max and current streaks.
 *
 * Two consecutive periods are "adjacent" when:
 *   • daily  → exactly 1 calendar day apart
 *   • weekly → exactly 1 ISO week apart (keys differ by 1 week number)
 *   • custom → the period key is the immediately next scheduled date
 *
 * For simplicity, custom and weekly use the same "1 step" logic on their keys.
 */
function computeStreaksFromKeys(
  periodKeys: string[],
  frequency: HabitSnapshot['frequency'],
  habit: Pick<HabitSnapshot, 'frequency' | 'customDays'>,
  todayKey: string,
): { currentStreak: number; longestStreak: number } {
  if (periodKeys.length === 0) return { currentStreak: 0, longestStreak: 0 }

  let longestStreak  = 1
  let runStreak      = 1

  // Walk backwards through sorted keys, counting consecutive periods
  for (let i = periodKeys.length - 1; i > 0; i--) {
    const isConsecutive = frequency === 'weekly'
      ? areConsecutiveWeeks(periodKeys[i - 1], periodKeys[i])
      : areConsecutiveDates(
          periodKeys[i - 1] as DateString,
          periodKeys[i]     as DateString,
          habit,
        )

    if (isConsecutive) {
      runStreak++
      longestStreak = Math.max(longestStreak, runStreak)
    } else {
      runStreak = 1
    }
  }

  // Current streak: the run ending at today (or yesterday for daily grace period)
  const currentStreak = computeCurrentStreak(periodKeys, frequency, habit, todayKey)

  return { currentStreak, longestStreak }
}

function areConsecutiveWeeks(keyA: string, keyB: string): boolean {
  // Keys are "YYYY-Www" — parse week numbers
  const [yearA, weekA] = keyA.split('-W').map(Number)
  const [yearB, weekB] = keyB.split('-W').map(Number)

  if (yearA === yearB) return weekB - weekA === 1
  // Cross-year boundary: week 52/53 → week 1
  if (yearB === yearA + 1 && weekA >= 52 && weekB === 1) return true
  return false
}

function areConsecutiveDates(
  prev: DateString,
  next: DateString,
  habit: Pick<HabitSnapshot, 'frequency' | 'customDays'>,
): boolean {
  if (habit.frequency === 'daily') {
    return daysBetween(prev, next) === 1
  }

  // Custom: next scheduled date after `prev` must equal `next`
  const strategy = FrequencyStrategyFactory.create(habit)
  let cursor = addDays(prev, 1)
  let safety = 0

  while (cursor < next && safety < 14) {
    if (strategy.isDueOn(cursor)) {
      // Found a scheduled date before `next` → they're not consecutive
      return false
    }
    cursor = addDays(cursor, 1)
    safety++
  }

  return strategy.isDueOn(next)
}

function computeCurrentStreak(
  periodKeys: string[],
  frequency: HabitSnapshot['frequency'],
  habit: Pick<HabitSnapshot, 'frequency' | 'customDays'>,
  todayKey: string,
): number {
  if (periodKeys.length === 0) return 0

  const lastKey = periodKeys[periodKeys.length - 1]

  // Grace period: the streak is still alive if the last completion was in the
  // previous period (yesterday for daily, last week for weekly).
  // This prevents the streak from resetting at midnight before the user has
  // had a chance to log today's habit.
  const isOngoing =
    lastKey === todayKey ||
    isLastPeriod(lastKey, todayKey, frequency)

  if (!isOngoing) return 0

  // Walk backwards from the end counting consecutive periods
  let streak = 1
  for (let i = periodKeys.length - 1; i > 0; i--) {
    const consecutive = frequency === 'weekly'
      ? areConsecutiveWeeks(periodKeys[i - 1], periodKeys[i])
      : areConsecutiveDates(
          periodKeys[i - 1] as DateString,
          periodKeys[i]     as DateString,
          habit,
        )

    if (consecutive) streak++
    else break
  }

  return streak
}

/**
 * True if `key` is exactly one period before `todayKey`.
 * Allows a one-period grace window so a habit logged yesterday
 * doesn't immediately lose its streak.
 */
function isLastPeriod(
  key: string,
  todayKey: string,
  frequency: HabitSnapshot['frequency'],
): boolean {
  if (frequency === 'weekly') {
    return areConsecutiveWeeks(key, todayKey)
  }
  // Daily / custom: yesterday
  const yesterday = addDays(todayKey as DateString, -1)
  return key === yesterday
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate the full streak model for a habit given its completion entries.
 *
 * @param habit    - Snapshot of the habit (needs frequency + customDays)
 * @param entries  - All completion entries for this habit (any order)
 * @param now      - Override today's date (useful in tests)
 */
export function calculateStreak(
  habit: Pick<HabitSnapshot, 'id' | 'frequency' | 'customDays'>,
  entries: ReadonlyArray<Pick<HabitEntry, 'date'>>,
  now?: DateString,
): HabitStreak {
  const today = now ?? todayUTC()

  if (entries.length === 0) {
    return {
      habitId: habit.id,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      completionRateLastMonth: 0,
      totalCompletions: entries.length,
    }
  }

  // Sort dates ascending
  const sortedDates = [...entries]
    .map((e) => e.date)
    .sort() as DateString[]

  // Reduce to period keys (deduplicates multiple completions in same period)
  const periodKeys = toPeriodKeys(sortedDates, habit.frequency)

  // Today's key
  const todayKey = habit.frequency === 'weekly' ? isoWeekKey(today) : today

  const { currentStreak, longestStreak } = computeStreaksFromKeys(
    periodKeys,
    habit.frequency,
    habit,
    todayKey,
  )

  // Completion rate over last 30 days
  const thirtyDaysAgo = addDays(today, -29) as DateString
  const completionRateLastMonth = calculateCompletionRate(
    habit,
    entries,
    thirtyDaysAgo,
    today,
  )

  return {
    habitId: habit.id,
    currentStreak,
    longestStreak,
    lastCompletedDate: sortedDates[sortedDates.length - 1],
    completionRateLastMonth,
    totalCompletions: entries.length,
  }
}

/**
 * Calculate what % of scheduled days in [from, to] the habit was completed.
 * Returns a number between 0 and 1.
 */
export function calculateCompletionRate(
  habit: Pick<HabitSnapshot, 'frequency' | 'customDays'>,
  entries: ReadonlyArray<Pick<HabitEntry, 'date'>>,
  from: DateString,
  to: DateString,
): number {
  const strategy = FrequencyStrategyFactory.create(habit)
  const dueDates = strategy.getDueDatesInRange(from, to)

  if (dueDates.length === 0) return 0

  const completedDates = new Set(entries.map((e) => e.date))

  // For weekly: count weeks where at least one completion exists
  if (habit.frequency === 'weekly') {
    const dueWeeks = new Set(dueDates.map(isoWeekKey))
    const completedWeeks = new Set(
      entries
        .filter((e) => e.date >= from && e.date <= to)
        .map((e) => isoWeekKey(e.date)),
    )
    let matched = 0
    for (const week of dueWeeks) {
      if (completedWeeks.has(week)) matched++
    }
    return matched / dueWeeks.size
  }

  // Daily / custom: count matching dates
  const matched = dueDates.filter((d) => completedDates.has(d)).length
  return matched / dueDates.length
}

/**
 * Check if a habit is due on a specific date.
 * Convenience wrapper — delegates to FrequencyStrategyFactory.
 */
export function isHabitDueOn(
  habit: Pick<HabitSnapshot, 'frequency' | 'customDays'>,
  date: DateString,
): boolean {
  return FrequencyStrategyFactory.create(habit).isDueOn(date)
}

/**
 * Determine if a habit was completed on a given date.
 */
export function wasCompletedOn(
  entries: ReadonlyArray<Pick<HabitEntry, 'date' | 'habitId'>>,
  habitId: string,
  date: DateString,
): boolean {
  return entries.some((e) => e.habitId === habitId && e.date === date)
}
