/**
 * DOMAIN LAYER — Habit Aggregate Root
 *
 * The Habit is the aggregate root of this bounded context.
 * All mutation goes through the entity's methods, never by direct field
 * assignment from outside, keeping invariants always valid.
 *
 * No framework deps. No infrastructure imports. Pure TypeScript.
 */

import { HabitDomainError } from '@domain/errors/HabitDomainError'
import type { HabitId, DateString } from '@domain/types/shared'

// ─── Value types ─────────────────────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekly' | 'custom'

export type HabitCategory =
  | 'health'
  | 'fitness'
  | 'mindfulness'
  | 'learning'
  | 'productivity'
  | 'social'
  | 'finance'
  | 'other'

export const ALL_CATEGORIES: HabitCategory[] = [
  'health', 'fitness', 'mindfulness', 'learning',
  'productivity', 'social', 'finance', 'other',
]

// ─── Plain-data snapshot (what gets persisted) ────────────────────────────────

/**
 * HabitSnapshot is the serialisable, plain-object form of a Habit.
 * Repositories store and return this; the entity class wraps it.
 */
export interface HabitSnapshot {
  readonly id: HabitId
  readonly name: string
  readonly description: string
  readonly category: HabitCategory
  readonly frequency: HabitFrequency
  /** For frequency === 'custom': which days of week are active (0=Sun … 6=Sat) */
  readonly customDays: ReadonlyArray<number>
  readonly color: string
  readonly icon: string
  readonly targetCompletionsPerPeriod: number
  readonly createdAt: DateString
  readonly updatedAt: DateString
  readonly isArchived: boolean
}

// ─── Entry (child entity) ────────────────────────────────────────────────────

export interface HabitEntry {
  readonly id: string
  readonly habitId: HabitId
  /** YYYY-MM-DD — the calendar date this completion belongs to */
  readonly date: DateString
  /** Full ISO-8601 timestamp of when the user pressed "done" */
  readonly completedAt: string
  readonly note: string
}

// ─── Streak view model (derived, never persisted) ────────────────────────────

export interface HabitStreak {
  readonly habitId: HabitId
  readonly currentStreak: number
  readonly longestStreak: number
  readonly lastCompletedDate: DateString | null
  readonly completionRateLastMonth: number   // 0–1
  readonly totalCompletions: number
}

// ─── Aggregate Root ───────────────────────────────────────────────────────────

/**
 * Habit — Aggregate Root
 *
 * SRP:  manages its own invariants (name length, custom days validity, etc.)
 * OCP:  open for extension via frequency strategies; closed for modification
 * ISP:  exposes only the surface area callers actually need
 */
export class Habit {
  // Private fields enforce encapsulation — state can only change via methods
  private readonly _snapshot: HabitSnapshot

  private constructor(snapshot: HabitSnapshot) {
    this._snapshot = Object.freeze({ ...snapshot })
  }

  // ─── Factory ─────────────────────────────────────────────────────────────

  /**
   * The ONLY way to create a Habit from raw data.
   * Runs all invariant checks before allowing construction.
   */
  static create(
    params: Omit<HabitSnapshot, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>,
    id: HabitId,
    now: DateString = new Date().toISOString(),
  ): Habit {
    Habit.assertValidName(params.name)
    Habit.assertValidCategory(params.category)
    Habit.assertValidColor(params.color)
    Habit.assertValidCustomDays(params.frequency, params.customDays)
    Habit.assertValidTarget(params.targetCompletionsPerPeriod)

    const snapshot: HabitSnapshot = {
      id,
      name: params.name.trim(),
      description: (params.description ?? '').trim(),
      category: params.category,
      frequency: params.frequency,
      customDays: params.frequency === 'custom'
        ? [...new Set(params.customDays ?? [])].sort()
        : [],
      color: params.color,
      icon: params.icon || '✅',
      targetCompletionsPerPeriod: params.targetCompletionsPerPeriod ?? 1,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    }

    return new Habit(snapshot)
  }

  /** Rehydrate a Habit from a stored snapshot (no validation — trust the DB) */
  static fromSnapshot(snapshot: HabitSnapshot): Habit {
    return new Habit(snapshot)
  }

  // ─── Read accessors ───────────────────────────────────────────────────────

  get id(): HabitId             { return this._snapshot.id }
  get name(): string            { return this._snapshot.name }
  get description(): string     { return this._snapshot.description }
  get category(): HabitCategory { return this._snapshot.category }
  get frequency(): HabitFrequency { return this._snapshot.frequency }
  get customDays(): ReadonlyArray<number> { return this._snapshot.customDays }
  get color(): string           { return this._snapshot.color }
  get icon(): string            { return this._snapshot.icon }
  get target(): number          { return this._snapshot.targetCompletionsPerPeriod }
  get createdAt(): DateString   { return this._snapshot.createdAt }
  get updatedAt(): DateString   { return this._snapshot.updatedAt }
  get isArchived(): boolean     { return this._snapshot.isArchived }

  // ─── Commands (return new instances — immutable pattern) ──────────────────

  rename(newName: string, now = new Date().toISOString()): Habit {
    Habit.assertValidName(newName)
    return new Habit({ ...this._snapshot, name: newName.trim(), updatedAt: now })
  }

  updateDescription(desc: string, now = new Date().toISOString()): Habit {
    return new Habit({ ...this._snapshot, description: desc.trim(), updatedAt: now })
  }

  archive(now = new Date().toISOString()): Habit {
    if (this._snapshot.isArchived) {
      throw new HabitDomainError('ALREADY_ARCHIVED', `Habit "${this.name}" is already archived.`)
    }
    return new Habit({ ...this._snapshot, isArchived: true, updatedAt: now })
  }

  unarchive(now = new Date().toISOString()): Habit {
    return new Habit({ ...this._snapshot, isArchived: false, updatedAt: now })
  }

  changeFrequency(
    frequency: HabitFrequency,
    customDays: number[] = [],
    now = new Date().toISOString(),
  ): Habit {
    Habit.assertValidCustomDays(frequency, customDays)
    return new Habit({
      ...this._snapshot,
      frequency,
      customDays: frequency === 'custom' ? [...new Set(customDays)].sort() : [],
      updatedAt: now,
    })
  }

  // ─── Snapshot export ──────────────────────────────────────────────────────

  toSnapshot(): HabitSnapshot {
    return this._snapshot
  }

  // ─── Invariant guards (static, reusable in use cases) ────────────────────

  static assertValidName(name: string): void {
    const trimmed = name?.trim() ?? ''
    if (trimmed.length === 0)
      throw new HabitDomainError('INVALID_NAME', 'Habit name cannot be empty.')
    if (trimmed.length > 80)
      throw new HabitDomainError('INVALID_NAME', 'Habit name cannot exceed 80 characters.')
  }

  static assertValidCategory(cat: string): void {
    if (!ALL_CATEGORIES.includes(cat as HabitCategory))
      throw new HabitDomainError('INVALID_CATEGORY', `"${cat}" is not a valid category.`)
  }

  static assertValidColor(color: string): void {
    if (!/^#[0-9a-fA-F]{6}$/.test(color))
      throw new HabitDomainError('INVALID_COLOR', `"${color}" is not a valid hex color.`)
  }

  static assertValidCustomDays(frequency: HabitFrequency, days: ReadonlyArray<number> = []): void {
    if (frequency !== 'custom') return
    if (days.length === 0)
      throw new HabitDomainError('INVALID_CUSTOM_DAYS', 'Custom frequency requires at least one day.')
    if (days.some((d) => d < 0 || d > 6 || !Number.isInteger(d)))
      throw new HabitDomainError('INVALID_CUSTOM_DAYS', 'Custom days must be integers 0–6.')
  }

  static assertValidTarget(target: number): void {
    if (!Number.isInteger(target) || target < 1 || target > 365)
      throw new HabitDomainError('INVALID_TARGET', 'Target completions must be between 1 and 365.')
  }
}
