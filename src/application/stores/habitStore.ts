/**
 * APPLICATION LAYER — Habit Store (Zustand)
 *
 * v2 additions:
 *  • `reorderHabits(newOrder: string[])` — reorders the habits array in-place
 *    using a Map lookup so it's O(n) regardless of list size.
 *  • No other slices changed — streaks, entries, gamification state untouched.
 *
 * Performance note: we store `habits` as an array (not a Map) because the
 * rendering layer needs ordered iteration. Reordering mutates the array once
 * via immer's produce-style Zustand setter; React only re-renders components
 * that subscribe to `habits` and only if the reference changes.
 */

import { create }              from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type { HabitSnapshot }  from '@domain/entities/Habit'
import type { HabitEntry }     from '@domain/entities/Habit'

// ─── State shape ──────────────────────────────────────────────────────────────

export interface HabitStoreState {
  // ── Data ──────────────────────────────────────────────────────────────
  habits:       HabitSnapshot[]
  entries:      HabitEntry[]
  selectedDate: string           // ISO date string YYYY-MM-DD

  // ── UI state ──────────────────────────────────────────────────────────
  isLoading:    boolean
  error:        string | null

  // ── Actions ───────────────────────────────────────────────────────────
  setHabits(habits: HabitSnapshot[]): void
  setEntries(entries: HabitEntry[]): void
  setSelectedDate(date: string): void
  setLoading(loading: boolean): void
  setError(error: string | null): void

  /**
   * Reorder the habits array by the given ordered ID list.
   *
   * - IDs not present in `newOrder` are appended at the end (safety net).
   * - IDs in `newOrder` that don't match any habit are silently ignored.
   * - This is an O(n) operation via a Map index.
   *
   * Called by useHabits after a DnD drop — the store is updated immediately
   * (optimistic) while the use case persists the order in the background.
   */
  reorderHabits(newOrder: string[]): void

  /**
   * Optimistically toggle a single habit's `isCompletedToday` flag without
   * waiting for the server. The hook reverts on failure by re-fetching.
   */
  optimisticToggle(habitId: string): void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useHabitStore = create<HabitStoreState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      habits:       [],
      entries:      [],
      selectedDate: new Date().toISOString().split('T')[0],
      isLoading:    false,
      error:        null,

      // ── Setters ────────────────────────────────────────────────────────
      setHabits:       (habits)       => set({ habits },       false, 'setHabits'),
      setEntries:      (entries)      => set({ entries },      false, 'setEntries'),
      setSelectedDate: (selectedDate) => set({ selectedDate }, false, 'setSelectedDate'),
      setLoading:      (isLoading)    => set({ isLoading },    false, 'setLoading'),
      setError:        (error)        => set({ error },        false, 'setError'),

      // ── Reorder ────────────────────────────────────────────────────────
      reorderHabits: (newOrder: string[]) => {
        const { habits } = get()

        // Build an index for O(1) lookup
        const byId = new Map<string, HabitSnapshot>(
          habits.map((h) => [h.id, h]),
        )

        // Ordered set first
        const ordered: HabitSnapshot[] = []
        const seen = new Set<string>()

        for (const id of newOrder) {
          const habit = byId.get(id)
          if (habit) {
            ordered.push(habit)
            seen.add(id)
          }
        }

        // Append any habits not covered by newOrder (e.g. filtered-out items)
        for (const habit of habits) {
          if (!seen.has(habit.id)) ordered.push(habit)
        }

        set({ habits: ordered }, false, 'reorderHabits')
      },

      // ── Optimistic toggle ──────────────────────────────────────────────
      optimisticToggle: (habitId: string) => {
        set(
          (s) => ({
            habits: s.habits.map((h) =>
              h.id === habitId
                ? { ...h, isCompletedToday: !(h as any).isCompletedToday }
                : h,
            ),
          }),
          false,
          'optimisticToggle',
        )
      },
    })),
    { name: 'HabitStore' },
  ),
)
