/**
 * APPLICATION LAYER — Heatmap Selectors
 *
 * Pure functions. No React. No side effects.
 * All heavy date math lives here so the UI components stay dumb.
 *
 * Public API:
 *   buildHeatmapData(entries, habits, referenceDate?)
 *     → { weeks, months, totalDays, maxCompletions }
 *
 *   getDayDetail(heatmapData, dateStr)
 *     → HeatmapDay | undefined
 */

import type { HabitEntry }   from '@domain/entities/Habit'
import type { HabitSnapshot } from '@domain/entities/Habit'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeatmapDay {
  /** ISO date string YYYY-MM-DD */
  date:             string
  /** 0-4 intensity bucket (0 = none, 4 = 100%) */
  level:            0 | 1 | 2 | 3 | 4
  /** Number of habits completed on this day */
  completedCount:   number
  /** Number of habits that were due on this day */
  dueCount:         number
  /** 0–1 completion ratio */
  ratio:            number
  /** Day of week 0=Sun … 6=Sat */
  dayOfWeek:        number
  /** Whether this day is in the future */
  isFuture:         boolean
  /** Whether this is today */
  isToday:          boolean
}

export interface HeatmapWeek {
  /** 0-based week index (0 = oldest) */
  weekIndex: number
  days:      (HeatmapDay | null)[]   // null = padding cell before grid starts
}

export interface MonthLabel {
  /** Label text e.g. "Jan", "Feb" */
  label:     string
  /** Column index (week) where this month label should appear */
  colIndex:  number
}

export interface HeatmapData {
  weeks:           HeatmapWeek[]
  months:          MonthLabel[]
  /** Calendar start date (Sunday of first week) */
  startDate:       string
  /** Calendar end date (today) */
  endDate:         string
  /** Lookup map: ISO date → HeatmapDay */
  dayIndex:        Map<string, HeatmapDay>
  /** Peak completions in a single day (for relative scaling UI) */
  maxCompletions:  number
  /** Total days with at least one completion */
  activeDays:      number
  /** Best single-day ratio achieved */
  bestRatio:       number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKS_TO_SHOW = 53   // ~1 year + partial week buffer
const MS_PER_DAY    = 86_400_000

// Intensity bucket thresholds
const LEVEL_THRESHOLDS = [
  0,      // level 0: no completions
  0.01,   // level 1: any completions  (1–24%)
  0.25,   // level 2: light            (25–49%)
  0.50,   // level 3: moderate         (50–74%)
  0.75,   // level 4: strong           (75–100%)
] as const

const MONTH_ABBREVS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD without timezone shifts */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format a Date as YYYY-MM-DD */
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Add N days to a Date (returns a new Date) */
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY)
}

function ratioToLevel(ratio: number): 0 | 1 | 2 | 3 | 4 {
  if (ratio <= 0)   return 0
  if (ratio < 0.25) return 1
  if (ratio < 0.50) return 2
  if (ratio < 0.75) return 3
  return 4
}

// ─── Core selector ────────────────────────────────────────────────────────────

/**
 * Build the full heatmap dataset from raw entries + habit snapshots.
 *
 * Performance:
 *  - Single pass over entries to build a Map<date, Set<habitId>>
 *  - Single pass over the 365-day calendar range
 *  - O(n) overall where n = number of entry records
 *
 * This function is memoized at the call site (useHeatmap hook) via useMemo,
 * so it only re-runs when the entries or habits arrays change by reference.
 */
export function buildHeatmapData(
  entries:       HabitEntry[],
  habits:        HabitSnapshot[],
  referenceDate?: Date,
): HeatmapData {
  const today     = referenceDate ?? new Date()
  const todayStr  = toISODate(today)

  // ── Step 1: Index completed habit IDs by date ─────────────────────────────
  // entries may contain multiple entries per habit per day (shouldn't, but safe)
  const completedByDate = new Map<string, Set<string>>()

  for (const entry of entries) {
    const dateStr = typeof entry.date === 'string' ? entry.date : toISODate(entry.date as any)
    if (!completedByDate.has(dateStr)) {
      completedByDate.set(dateStr, new Set())
    }
    completedByDate.get(dateStr)!.add(entry.habitId)
  }

  // ── Step 2: Index habits by id for due-date checks ────────────────────────
  // For heatmap purposes we treat all non-archived habits as "due every day"
  // unless we have per-habit frequency data.  Frequency-aware due counting
  // is complex and not in scope for the heatmap (streaks own that logic).
  // We use total active habit count as dueCount for simplicity and consistency.
  const activeHabits = habits.filter((h) => !h.isArchived)
  const habitCount   = activeHabits.length

  // ── Step 3: Determine grid start date (Sunday, ~52 weeks ago) ────────────
  const gridEnd   = today
  const rawStart  = addDays(today, -(WEEKS_TO_SHOW * 7 - 1))
  // Snap back to Sunday
  const dow       = rawStart.getDay()   // 0=Sun
  const gridStart = addDays(rawStart, -dow)
  const startStr  = toISODate(gridStart)

  // ── Step 4: Build day entries ─────────────────────────────────────────────
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / MS_PER_DAY) + 1

  const dayIndex     = new Map<string, HeatmapDay>()
  const weeks: HeatmapWeek[] = []
  let   maxCompletions = 0
  let   activeDays     = 0
  let   bestRatio      = 0

  let   currentWeekDays: (HeatmapDay | null)[] = []
  let   weekIndex = 0

  for (let i = 0; i < totalDays; i++) {
    const date      = addDays(gridStart, i)
    const dateStr   = toISODate(date)
    const dayOfWeek = date.getDay()

    // Start a new week array every Sunday
    if (dayOfWeek === 0 && i > 0) {
      weeks.push({ weekIndex, days: currentWeekDays })
      weekIndex++
      currentWeekDays = []
    }

    const isFuture  = dateStr > todayStr
    const isToday   = dateStr === todayStr

    let completedCount = 0
    let dueCount       = habitCount
    let ratio          = 0

    if (!isFuture) {
      const completed = completedByDate.get(dateStr)
      completedCount  = completed ? completed.size : 0
      ratio           = dueCount > 0 ? completedCount / dueCount : 0

      if (completedCount > 0) activeDays++
      if (completedCount > maxCompletions) maxCompletions = completedCount
      if (ratio > bestRatio) bestRatio = ratio
    }

    const level = isFuture ? 0 : ratioToLevel(ratio)

    const day: HeatmapDay = {
      date: dateStr,
      level,
      completedCount,
      dueCount,
      ratio,
      dayOfWeek,
      isFuture,
      isToday,
    }

    currentWeekDays.push(day)
    dayIndex.set(dateStr, day)
  }

  // Flush last partial week
  if (currentWeekDays.length > 0) {
    // Pad to 7 cells if needed
    while (currentWeekDays.length < 7) currentWeekDays.push(null)
    weeks.push({ weekIndex, days: currentWeekDays })
  }

  // ── Step 5: Month labels ──────────────────────────────────────────────────
  const months: MonthLabel[] = []
  let lastMonth = -1

  for (let w = 0; w < weeks.length; w++) {
    const week = weeks[w]
    // Find first non-null day in this week
    const firstDay = week.days.find((d): d is HeatmapDay => d !== null)
    if (!firstDay) continue

    const month = parseLocalDate(firstDay.date).getMonth()
    if (month !== lastMonth) {
      months.push({ label: MONTH_ABBREVS[month], colIndex: w })
      lastMonth = month
    }
  }

  return {
    weeks,
    months,
    startDate:      startStr,
    endDate:        todayStr,
    dayIndex,
    maxCompletions,
    activeDays,
    bestRatio,
  }
}

/**
 * Retrieve the completed habit IDs for a specific day from the raw entries.
 * Used by DayDetailModal to show which habits were completed.
 */
export function getDayCompletedHabits(
  entries:  HabitEntry[],
  habits:   HabitSnapshot[],
  dateStr:  string,
): HabitSnapshot[] {
  const completedIds = new Set(
    entries
      .filter((e) => {
        const d = typeof e.date === 'string' ? e.date : toISODate(e.date as any)
        return d === dateStr
      })
      .map((e) => e.habitId),
  )

  return habits.filter((h) => completedIds.has(h.id))
}
