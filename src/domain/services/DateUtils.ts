/**
 * DOMAIN LAYER — DateUtils
 *
 * Pure functions for date arithmetic.
 * Uses UTC throughout to avoid timezone-related bugs where a habit
 * completed at 11pm local time might show as "yesterday" in UTC.
 *
 * No external date libraries — keeps the domain dependency-free.
 */

import type { DateString } from '@domain/types/shared'

// ─── Parsing & formatting ─────────────────────────────────────────────────────

/**
 * Parse a YYYY-MM-DD string into a UTC Date.
 * Always treats the date as midnight UTC.
 */
export function parseDate(dateStr: DateString): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * Format a Date to YYYY-MM-DD using UTC fields.
 */
export function formatDate(date: Date): DateString {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}` as DateString
}

/**
 * Return today's date as a YYYY-MM-DD DateString in UTC.
 * Accepts an optional override (useful in tests).
 */
export function todayUTC(overrideNow?: Date): DateString {
  return formatDate(overrideNow ?? new Date())
}

// ─── Arithmetic ───────────────────────────────────────────────────────────────

/** Number of full calendar days between two DateStrings (always non-negative) */
export function daysBetween(a: DateString, b: DateString): number {
  const msA = parseDate(a).getTime()
  const msB = parseDate(b).getTime()
  return Math.abs(Math.round((msB - msA) / 86_400_000))
}

/**
 * Add `n` days to a DateString.
 * Negative `n` goes backwards.
 */
export function addDays(date: DateString, n: number): DateString {
  const d = parseDate(date)
  d.setUTCDate(d.getUTCDate() + n)
  return formatDate(d)
}

/** Return the ISO week number (1–53) for a DateString */
export function isoWeekNumber(date: DateString): number {
  const d = parseDate(date)
  // Move to Thursday in the same week (ISO week standard)
  const thursday = new Date(d)
  thursday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3)
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4))
  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/** Year + ISO week as a unique string key, e.g. "2024-W03" */
export function isoWeekKey(date: DateString): string {
  const d = parseDate(date)
  // Adjust to the ISO week's Thursday to get the correct year
  const thursday = new Date(d)
  thursday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3)
  const year = thursday.getUTCFullYear()
  const week = String(isoWeekNumber(date)).padStart(2, '0')
  return `${year}-W${week}`
}

/**
 * Build a sorted array of all DateStrings in [from, to] inclusive.
 */
export function dateRange(from: DateString, to: DateString): DateString[] {
  const dates: DateString[] = []
  let cursor = from
  while (cursor <= to) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

/**
 * Return the YYYY-MM-DD of the first day of the ISO week containing `date`.
 * Monday = start of week.
 */
export function startOfISOWeek(date: DateString): DateString {
  const d = parseDate(date)
  const dayOfWeek = (d.getUTCDay() + 6) % 7   // Mon=0, Sun=6
  d.setUTCDate(d.getUTCDate() - dayOfWeek)
  return formatDate(d)
}

/** True if `date` is today or in the past (UTC) */
export function isNotFuture(date: DateString, now = todayUTC()): boolean {
  return date <= now
}

/** True if two dates fall in the same ISO calendar week */
export function isSameISOWeek(a: DateString, b: DateString): boolean {
  return isoWeekKey(a) === isoWeekKey(b)
}
