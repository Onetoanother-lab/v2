/**
 * DOMAIN LAYER — IHabitRepository Interface (Phase 3)
 *
 * Added in Phase 3:
 *   • findByCategory(category)   — returns habits matching a single category
 *   • findByTags(tags, mode)     — returns habits matching any/all tags
 *   • getAllTags()                — returns every tag used across all habits (for filter UI)
 *   • update(dto)                — update name/category/tags/color/icon without touching streaks
 *
 * Backward compatibility:
 *   • Existing methods (findAll, findById, create, delete, findEntries…) UNCHANGED
 *   • Infrastructure implementation adds columns via IDB migration (version bump)
 *   • Old habits missing tags/color/icon are hydrated with safe defaults
 *
 * Architecture contract:
 *   Repository interfaces live in the DOMAIN layer.
 *   Concrete implementations live in the INFRASTRUCTURE layer.
 *   Use cases depend on this interface, never on the concrete class.
 */

import type {
  Habit,
  HabitSnapshot,
  HabitEntry,
  CreateHabitDTO,
  UpdateHabitDTO,
  HabitCategory,
} from '@domain/entities/Habit'
import type { Result } from '@domain/types/Result'

// ─── Query options ────────────────────────────────────────────────────────────

export interface GetHabitsOptions {
  includeArchived?: boolean
  category?:        HabitCategory | null    // null = all categories
  tags?:            string[]               // empty = no tag filter
  tagMode?:         'any' | 'all'          // 'any' = OR, 'all' = AND (default: 'any')
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IHabitRepository {
  // ── Read ──────────────────────────────────────────────────────────────────
  findAll(options?: GetHabitsOptions): Promise<Habit[]>
  findById(id: string): Promise<Habit | null>

  /**
   * Returns every unique tag string across all active habits, sorted alpha.
   * Used to populate the tag filter UI without a full habits fetch.
   */
  getAllTags(): Promise<string[]>

  /**
   * Returns every unique category that has at least one active habit.
   * Used to populate category filter tabs dynamically.
   */
  getActiveCategories(): Promise<HabitCategory[]>

  // ── Write ─────────────────────────────────────────────────────────────────
  create(dto: CreateHabitDTO): Promise<Habit>

  /**
   * Partial update. Only updates the provided fields.
   * Does NOT touch streaks, completions, or archived status.
   */
  update(dto: UpdateHabitDTO): Promise<Habit>

  delete(id: string): Promise<void>
  archive(id: string): Promise<void>
  restore(id: string): Promise<void>

  // ── Entries ───────────────────────────────────────────────────────────────
  findEntriesForDate(date: string): Promise<HabitEntry[]>
  findEntriesForHabit(habitId: string, fromDate?: string): Promise<HabitEntry[]>
  findAllEntries(): Promise<HabitEntry[]>
  createEntry(habitId: string, date: string): Promise<HabitEntry>
  deleteEntry(habitId: string, date: string): Promise<void>
  entryExists(habitId: string, date: string): Promise<boolean>
}
