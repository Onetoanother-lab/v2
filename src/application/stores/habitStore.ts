/**
 * APPLICATION LAYER — Habit Store
 *
 * Manages habit list state. Business logic lives in use-case files;
 * the store is just state + thin action wrappers that call use cases.
 */

import { create } from 'zustand'
import type { Habit, HabitEntry } from '@domain/entities/Habit'

interface HabitState {
  habits: Habit[]
  entries: HabitEntry[]
  selectedDate: string        // YYYY-MM-DD
  isLoading: boolean
  error: string | null

  // ─── Actions (implementations added in Phase 2) ──────────
  setHabits: (habits: Habit[]) => void
  setEntries: (entries: HabitEntry[]) => void
  setSelectedDate: (date: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  /** Optimistic add — use case populates real ID later */
  addHabit: (habit: Habit) => void
  removeHabit: (id: string) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  toggleEntry: (habitId: string, date: string) => void
}

const today = () => new Date().toISOString().split('T')[0]

export const useHabitStore = create<HabitState>()((set) => ({
  habits: [],
  entries: [],
  selectedDate: today(),
  isLoading: false,
  error: null,

  setHabits:       (habits)   => set({ habits }),
  setEntries:      (entries)  => set({ entries }),
  setSelectedDate: (date)     => set({ selectedDate: date }),
  setLoading:      (loading)  => set({ isLoading: loading }),
  setError:        (error)    => set({ error }),

  addHabit: (habit) =>
    set((s) => ({ habits: [...s.habits, habit] })),

  removeHabit: (id) =>
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

  updateHabit: (id, patch) =>
    set((s) => ({
      habits: s.habits.map((h) =>
        h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h,
      ),
    })),

  toggleEntry: (habitId, date) =>
    set((s) => {
      const exists = s.entries.find(
        (e) => e.habitId === habitId && e.date === date,
      )
      if (exists) {
        return { entries: s.entries.filter((e) => e.id !== exists.id) }
      }
      const newEntry: HabitEntry = {
        id: crypto.randomUUID(),
        habitId,
        date,
        completedAt: new Date().toISOString(),
      }
      return { entries: [...s.entries, newEntry] }
    }),
}))
