/**
 * INFRASTRUCTURE LAYER — LocalStorage Habit Entry Repository
 *
 * Concrete implementation of IHabitEntryRepository.
 */

import type { HabitEntry }               from '@domain/entities/Habit'
import type { IHabitEntryRepository }    from '@domain/interfaces/repositories'
import type { HabitId, EntryId, DateString } from '@domain/types/shared'

const STORAGE_KEY = 'habit-tracker:entries-v2'

function loadEntries(): HabitEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HabitEntry[]) : []
  } catch {
    return []
  }
}

function saveEntries(entries: HabitEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export const localEntryRepository: IHabitEntryRepository = {
  async getEntriesForHabit(habitId: HabitId) {
    return loadEntries()
      .filter((e) => e.habitId === habitId)
      .sort((a, b) => a.date.localeCompare(b.date))
  },

  async getEntriesForDate(date: DateString) {
    return loadEntries().filter((e) => e.date === date)
  },

  async getEntriesForHabitInRange(habitId: HabitId, from: DateString, to: DateString) {
    return loadEntries().filter(
      (e) => e.habitId === habitId && e.date >= from && e.date <= to,
    )
  },

  async getEntriesInRange(from: DateString, to: DateString) {
    return loadEntries().filter((e) => e.date >= from && e.date <= to)
  },

  async saveEntry(entry: HabitEntry) {
    const entries = loadEntries()
    entries.push(entry)
    saveEntries(entries)
  },

  async deleteEntry(id: EntryId) {
    saveEntries(loadEntries().filter((e) => e.id !== id))
  },

  async hasEntryForDate(habitId: HabitId, date: DateString) {
    return loadEntries().some((e) => e.habitId === habitId && e.date === date)
  },

  async getEntryById(id: EntryId) {
    return loadEntries().find((e) => e.id === id) ?? null
  },

  async deleteAllEntriesForHabit(habitId: HabitId) {
    saveEntries(loadEntries().filter((e) => e.habitId !== habitId))
  },
}
