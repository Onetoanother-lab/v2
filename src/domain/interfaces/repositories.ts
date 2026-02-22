/**
 * DOMAIN LAYER — Repository Interfaces
 *
 * ─── Dependency Inversion Principle ────────────────────────────────────────
 *
 * High-level policy (use cases) depends on this abstraction.
 * Low-level detail (localStorage, IndexedDB, REST API) implements it.
 *
 * The domain layer DEFINES what it needs.
 * The infrastructure layer PROVIDES the implementation.
 * They never import each other directly.
 *
 * This file has zero imports from application or infrastructure layers.
 */

import type { Habit, HabitEntry, HabitSnapshot } from '@domain/entities/Habit'
import type { HabitId, EntryId, DateString } from '@domain/types/shared'

// ─── IHabitRepository ────────────────────────────────────────────────────────

export interface IHabitRepository {
  /** Return all non-archived habits, ordered by createdAt asc */
  getAll(): Promise<Habit[]>

  /** Return all habits including archived ones */
  getAllIncludingArchived(): Promise<Habit[]>

  /** Return a single habit by ID, or null if not found */
  getById(id: HabitId): Promise<Habit | null>

  /**
   * Persist a new Habit aggregate.
   * The entity already carries its ID and timestamps — the repo stores as-is.
   */
  save(habit: Habit): Promise<void>

  /**
   * Persist changes to an existing Habit aggregate.
   * Throws if the habit doesn't exist.
   */
  update(habit: Habit): Promise<void>

  /** Hard-delete a habit and all its entries */
  delete(id: HabitId): Promise<void>

  /** Check if a habit with the given name already exists (for dedup guard) */
  existsByName(name: string): Promise<boolean>
}

// ─── IHabitEntryRepository ────────────────────────────────────────────────────

export interface IHabitEntryRepository {
  /** All entries for a given habit, sorted by date asc */
  getEntriesForHabit(habitId: HabitId): Promise<HabitEntry[]>

  /** All entries for a specific calendar date (across all habits) */
  getEntriesForDate(date: DateString): Promise<HabitEntry[]>

  /** Entries for a specific habit in the given date range [from, to] inclusive */
  getEntriesForHabitInRange(
    habitId: HabitId,
    from: DateString,
    to: DateString,
  ): Promise<HabitEntry[]>

  /** Entries for ALL habits in a date range — used by the dashboard */
  getEntriesInRange(from: DateString, to: DateString): Promise<HabitEntry[]>

  /**
   * Persist a new completion entry.
   * The entity already carries its ID — the repo stores as-is.
   */
  saveEntry(entry: HabitEntry): Promise<void>

  /** Remove a single completion entry */
  deleteEntry(id: EntryId): Promise<void>

  /** True if a completion exists for habitId on the given date */
  hasEntryForDate(habitId: HabitId, date: DateString): Promise<boolean>

  /** Retrieve a specific entry by its ID */
  getEntryById(id: EntryId): Promise<HabitEntry | null>

  /** Remove ALL entries for a habit (called when a habit is deleted) */
  deleteAllEntriesForHabit(habitId: HabitId): Promise<void>
}

