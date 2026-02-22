/**
 * INFRASTRUCTURE LAYER — LocalStorage Habit Repository
 *
 * Concrete implementation of IHabitRepository.
 * Stores HabitSnapshots (plain objects) in localStorage as JSON.
 * Rehydrates them back into Habit aggregate instances on read.
 *
 * Swappable: replace with IndexedDB or REST API adapter without changing
 * any domain or application layer code.
 */

import { Habit }                    from '@domain/entities/Habit'
import type { HabitSnapshot }       from '@domain/entities/Habit'
import type { IHabitRepository }    from '@domain/interfaces/repositories'
import type { HabitId }             from '@domain/types/shared'

const STORAGE_KEY = 'habit-tracker:habits-v2'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadSnapshots(): HabitSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HabitSnapshot[]) : []
  } catch {
    return []
  }
}

function saveSnapshots(snapshots: HabitSnapshot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
}

// ─── Implementation ───────────────────────────────────────────────────────────

export const localHabitRepository: IHabitRepository = {
  async getAll() {
    return loadSnapshots()
      .filter((s) => !s.isArchived)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(Habit.fromSnapshot)
  },

  async getAllIncludingArchived() {
    return loadSnapshots()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(Habit.fromSnapshot)
  },

  async getById(id: HabitId) {
    const snapshot = loadSnapshots().find((s) => s.id === id)
    return snapshot ? Habit.fromSnapshot(snapshot) : null
  },

  async save(habit: Habit) {
    const snapshots = loadSnapshots()
    snapshots.push(habit.toSnapshot())
    saveSnapshots(snapshots)
  },

  async update(habit: Habit) {
    const snapshots = loadSnapshots()
    const index = snapshots.findIndex((s) => s.id === habit.id)
    if (index === -1) throw new Error(`Habit ${habit.id} not found in storage`)
    snapshots[index] = habit.toSnapshot()
    saveSnapshots(snapshots)
  },

  async delete(id: HabitId) {
    saveSnapshots(loadSnapshots().filter((s) => s.id !== id))
  },

  async existsByName(name: string) {
    const normalized = name.trim().toLowerCase()
    return loadSnapshots().some(
      (s) => s.name.trim().toLowerCase() === normalized && !s.isArchived,
    )
  },
}

