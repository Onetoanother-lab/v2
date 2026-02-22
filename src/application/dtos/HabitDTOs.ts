/**
 * APPLICATION LAYER — Data Transfer Objects (DTOs)
 *
 * DTOs define the shape of data flowing INTO use cases from the outside
 * (presentation layer, tests, CLI, etc.) and OUT of use cases back to callers.
 *
 * They deliberately use plain primitive types — no domain classes —
 * so the presentation layer has zero coupling to domain internals.
 *
 * ISP principle: each use case has its own focused input/output type.
 * No god-object "HabitService" with 20 methods on one interface.
 */

import type { HabitCategory, HabitFrequency } from '@domain/entities/Habit'

// ─── CreateHabit ─────────────────────────────────────────────────────────────

export interface CreateHabitInput {
  name: string
  description?: string
  category: HabitCategory
  frequency: HabitFrequency
  /** Required when frequency === 'custom' */
  customDays?: number[]
  /** Hex color string, e.g. "#22c55e" */
  color: string
  /** Emoji or icon identifier */
  icon?: string
  /** How many times per period to complete (default: 1) */
  targetCompletionsPerPeriod?: number
}

export interface CreateHabitOutput {
  id: string
  name: string
  description: string
  category: HabitCategory
  frequency: HabitFrequency
  customDays: number[]
  color: string
  icon: string
  target: number
  scheduleDescription: string   // "Every day", "Every Mon, Wed, Fri", etc.
  createdAt: string
}

// ─── CompleteHabit ───────────────────────────────────────────────────────────

export interface CompleteHabitInput {
  habitId: string
  /** Defaults to today (UTC) if omitted */
  date?: string
  note?: string
}

export interface CompleteHabitOutput {
  entryId: string
  habitId: string
  date: string
  completedAt: string
  /** Whether this was a toggle-off (entry deleted) or toggle-on (entry created) */
  action: 'completed' | 'uncompleted'
  /** Refreshed streak after this action */
  currentStreak: number
}

// ─── GetHabits ───────────────────────────────────────────────────────────────

export interface GetHabitsInput {
  /** Filter to habits due on a specific date. Defaults to today. */
  forDate?: string
  includeArchived?: boolean
}

export interface HabitSummary {
  id: string
  name: string
  description: string
  category: HabitCategory
  frequency: HabitFrequency
  customDays: number[]
  color: string
  icon: string
  target: number
  scheduleDescription: string
  isArchived: boolean
  isDueToday: boolean
  isCompletedToday: boolean
  currentStreak: number
  longestStreak: number
  completionRateLastMonth: number
  totalCompletions: number
  lastCompletedDate: string | null
  createdAt: string
}

export interface GetHabitsOutput {
  habits: HabitSummary[]
  totalDueToday: number
  totalCompletedToday: number
  overallCompletionRateToday: number   // 0–1
}

// ─── DeleteHabit ─────────────────────────────────────────────────────────────

export interface DeleteHabitInput {
  habitId: string
  /** If true, archive instead of hard-delete (default: false) */
  archiveOnly?: boolean
}

export interface DeleteHabitOutput {
  habitId: string
  action: 'deleted' | 'archived'
}

// ─── GetStreak ───────────────────────────────────────────────────────────────

export interface GetStreakInput {
  habitId: string
  /** Override "today" for historical analysis */
  asOf?: string
}

export interface GetStreakOutput {
  habitId: string
  currentStreak: number
  longestStreak: number
  lastCompletedDate: string | null
  completionRateLastMonth: number
  totalCompletions: number
  /** Summary sentence: "🔥 12-day streak!" */
  label: string
}
