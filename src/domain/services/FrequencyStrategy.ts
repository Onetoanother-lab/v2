/**
 * DOMAIN LAYER — Frequency Strategy
 *
 * ─── Design Decisions ───────────────────────────────────────────────────────
 *
 * OCP (Open/Closed): New frequencies (e.g. 'monthly', 'workdays') are added
 *   by implementing IFrequencyStrategy and registering in FrequencyStrategyFactory.
 *   No existing code changes.
 *
 * SRP (Single Responsibility): Each strategy class does exactly one thing —
 *   answer "is this habit due on this date?".
 *
 * LSP (Liskov Substitution): All strategies are interchangeable behind the
 *   IFrequencyStrategy interface. Callers never need to know which one is active.
 *
 * DIP (Dependency Inversion): Higher-level services depend on IFrequencyStrategy,
 *   not on concrete Daily/Weekly/CustomStrategy classes.
 *
 * No imports from application or infrastructure layers.
 */

import type { HabitFrequency, HabitSnapshot } from '@domain/entities/Habit'
import type { DateString } from '@domain/types/shared'
import { parseDate, formatDate, daysBetween } from '@domain/services/DateUtils'

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IFrequencyStrategy {
  /** Returns true if the habit should be completed on the given date */
  isDueOn(date: DateString): boolean

  /**
   * Returns the set of dates within [from, to] on which the habit is due.
   * Used by streak/stats calculators.
   */
  getDueDatesInRange(from: DateString, to: DateString): DateString[]

  /** Human-readable label for the UI ("Every day", "Mondays & Wednesdays", …) */
  describe(): string
}

// ─── Strategy: Daily ─────────────────────────────────────────────────────────

export class DailyStrategy implements IFrequencyStrategy {
  isDueOn(_date: DateString): boolean {
    return true   // always due — every calendar day
  }

  getDueDatesInRange(from: DateString, to: DateString): DateString[] {
    const dates: DateString[] = []
    const start = parseDate(from)
    const end   = parseDate(to)
    const cursor = new Date(start)

    while (cursor <= end) {
      dates.push(formatDate(cursor) as DateString)
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    return dates
  }

  describe(): string {
    return 'Every day'
  }
}

// ─── Strategy: Weekly ────────────────────────────────────────────────────────

/**
 * "Weekly" means: once per ISO calendar week.
 * The habit is "due" on any day of the week but counts only once.
 * Here we use Monday as the representative "due day" per week, but any
 * completion in that week satisfies the requirement.
 *
 * Note: The streak logic accounts for this — see StreakCalculator.
 */
export class WeeklyStrategy implements IFrequencyStrategy {
  isDueOn(_date: DateString): boolean {
    return true   // any day can satisfy a weekly requirement
  }

  getDueDatesInRange(from: DateString, to: DateString): DateString[] {
    // Return one representative date per week (Monday of each week)
    const dates: DateString[] = []
    const start  = parseDate(from)
    const end    = parseDate(to)
    const cursor = new Date(start)

    // Advance to first Monday on or after start
    const dayOfWeek = cursor.getUTCDay()           // 0=Sun, 1=Mon…
    const daysToMon = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7
    cursor.setUTCDate(cursor.getUTCDate() + (dayOfWeek === 1 ? 0 : daysToMon))

    while (cursor <= end) {
      dates.push(formatDate(cursor) as DateString)
      cursor.setUTCDate(cursor.getUTCDate() + 7)
    }

    return dates
  }

  describe(): string {
    return 'Once a week'
  }
}

// ─── Strategy: Custom (specific days of week) ─────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export class CustomStrategy implements IFrequencyStrategy {
  /** Set of active days (0=Sun … 6=Sat) */
  private readonly activeDays: ReadonlySet<number>

  constructor(days: ReadonlyArray<number>) {
    this.activeDays = new Set(days)
  }

  isDueOn(date: DateString): boolean {
    const d = parseDate(date)
    return this.activeDays.has(d.getUTCDay())
  }

  getDueDatesInRange(from: DateString, to: DateString): DateString[] {
    const dates: DateString[] = []
    const start  = parseDate(from)
    const end    = parseDate(to)
    const cursor = new Date(start)

    const totalDays = daysBetween(from, to) + 1
    for (let i = 0; i < totalDays; i++) {
      if (this.activeDays.has(cursor.getUTCDay())) {
        dates.push(formatDate(cursor) as DateString)
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    return dates
  }

  describe(): string {
    const names = [...this.activeDays]
      .sort()
      .map((d) => DAY_NAMES[d])
      .join(', ')
    return `Every ${names}`
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * FrequencyStrategyFactory
 *
 * Maps a HabitSnapshot to the correct IFrequencyStrategy.
 * OCP: adding a new frequency type only requires a new case here
 * and a new class above — callers never change.
 */
export class FrequencyStrategyFactory {
  static create(habit: Pick<HabitSnapshot, 'frequency' | 'customDays'>): IFrequencyStrategy {
    switch (habit.frequency) {
      case 'daily':
        return new DailyStrategy()

      case 'weekly':
        return new WeeklyStrategy()

      case 'custom':
        return new CustomStrategy(habit.customDays)

      default: {
        // Exhaustiveness check — TypeScript will error here if a new
        // HabitFrequency variant is added without handling it.
        const _exhaustive: never = habit.frequency
        throw new Error(`Unhandled frequency: ${_exhaustive}`)
      }
    }
  }

  /** Convenience: describe a habit's schedule in plain English */
  static describe(habit: Pick<HabitSnapshot, 'frequency' | 'customDays'>): string {
    return FrequencyStrategyFactory.create(habit).describe()
  }

  /** Convenience: check if a habit is due on a specific date */
  static isDueOn(
    habit: Pick<HabitSnapshot, 'frequency' | 'customDays'>,
    date: DateString,
  ): boolean {
    return FrequencyStrategyFactory.create(habit).isDueOn(date)
  }
}
