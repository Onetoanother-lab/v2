/**
 * DOMAIN LAYER — Repository Interfaces
 *
 * v2 addition: reorderHabits — persists user-defined drag order.
 * This is the ONLY change from the original file.
 */

import type { Habit, HabitEntry, HabitSnapshot } from '@domain/entities/Habit'
import type { HabitId, EntryId, DateString } from '@domain/types/shared'

// ─── IHabitRepository ────────────────────────────────────────────────────────

export interface IHabitRepository {
  getAll(): Promise<Habit[]>
  getAllIncludingArchived(): Promise<Habit[]>
  getById(id: HabitId): Promise<Habit | null>
  save(habit: Habit): Promise<void>
  update(habit: Habit): Promise<void>
  delete(id: HabitId): Promise<void>
  existsByName(name: string): Promise<boolean>

  /**
   * Persist the user-defined drag sort order for a batch of habits.
   * Each entry pairs a habitId with its new 0-based position index.
   * Only the `order` field is updated — streaks, entries, and all other
   * data are untouched.
   *
   * Called by ReorderHabitsUseCase after a successful DnD drop.
   */
  reorderHabits(
    updates: ReadonlyArray<{ habitId: HabitId; order: number }>,
  ): Promise<void>
}

// ─── IHabitEntryRepository ────────────────────────────────────────────────────

export interface IHabitEntryRepository {
  getEntriesForHabit(habitId: HabitId): Promise<HabitEntry[]>
  getEntriesForDate(date: DateString): Promise<HabitEntry[]>
  getEntriesForHabitInRange(
    habitId: HabitId,
    from: DateString,
    to: DateString,
  ): Promise<HabitEntry[]>
  getEntriesInRange(from: DateString, to: DateString): Promise<HabitEntry[]>
  saveEntry(entry: HabitEntry): Promise<void>
  deleteEntry(id: EntryId): Promise<void>
  hasEntryForDate(habitId: HabitId, date: DateString): Promise<boolean>
  getEntryById(id: EntryId): Promise<HabitEntry | null>
  deleteAllEntriesForHabit(habitId: HabitId): Promise<void>
}
