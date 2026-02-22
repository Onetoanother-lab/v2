/**
 * INFRASTRUCTURE LAYER — LocalStorage Habit Repository
 *
 * v2: implements reorderHabits() to satisfy the updated IHabitRepository
 * interface. Stores `order` inside each HabitSnapshot in localStorage.
 */

import type { Habit }               from '@domain/entities/Habit'
import type { HabitSnapshot }       from '@domain/entities/Habit'
import type { IHabitRepository }    from '@domain/interfaces/repositories'
import type { HabitId }             from '@domain/types/shared'
import { HabitId as mkHabitId }     from '@domain/types/shared'

const STORAGE_KEY = 'habit-tracker:habits-v2'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StoredSnapshot = HabitSnapshot & { order?: number }

function loadSnapshots(): StoredSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSnapshot[]) : []
  } catch {
    return []
  }
}

function saveSnapshots(snapshots: StoredSnapshot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
}

/** Sort by order ASC, fallback createdAt ASC (same logic as IDB repository) */
function byOrder(a: StoredSnapshot, b: StoredSnapshot): number {
  const aOrd = a.order ?? Number.MAX_SAFE_INTEGER
  const bOrd = b.order ?? Number.MAX_SAFE_INTEGER
  if (aOrd !== bOrd) return aOrd - bOrd
  return a.createdAt.localeCompare(b.createdAt)
}

// ─── Implementation ───────────────────────────────────────────────────────────

export const localHabitRepository: IHabitRepository = {
  async getAll() {
    return loadSnapshots()
      .filter((s) => !s.isArchived)
      .sort(byOrder)
      .map(Habit.fromSnapshot)
  },

  async getAllIncludingArchived() {
    return loadSnapshots()
      .sort(byOrder)
      .map(Habit.fromSnapshot)
  },

  async getById(id: HabitId) {
    const snapshot = loadSnapshots().find((s) => s.id === id)
    return snapshot ? Habit.fromSnapshot(snapshot) : null
  },

  async save(habit: Habit) {
    const snapshots = loadSnapshots()
    const snapshot: StoredSnapshot = {
      ...habit.toSnapshot(),
      // New habits go to the end
      order: snapshots.length,
    }
    snapshots.push(snapshot)
    saveSnapshots(snapshots)
  },

  async update(habit: Habit) {
    const snapshots = loadSnapshots()
    const index = snapshots.findIndex((s) => s.id === habit.id)
    if (index === -1) throw new Error(`Habit ${habit.id} not found in storage`)
    // Preserve existing order — update never overwrites it
    const existing = snapshots[index]
    snapshots[index] = { ...habit.toSnapshot(), order: existing.order }
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

  async reorderHabits(updates) {
    const snapshots = loadSnapshots()
    const orderMap = new Map(updates.map(({ habitId, order }) => [habitId as string, order]))

    const updated = snapshots.map((s) =>
      orderMap.has(s.id) ? { ...s, order: orderMap.get(s.id)! } : s,
    )
    saveSnapshots(updated)
  },
}
