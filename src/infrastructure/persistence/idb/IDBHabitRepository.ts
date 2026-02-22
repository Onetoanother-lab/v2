/**
 * INFRASTRUCTURE — IndexedDB Habit Repository
 *
 * v2 changes:
 *   • getAll() and getAllIncludingArchived() now sort by `order ASC`
 *     (fallback: createdAt ASC for records without an order value).
 *   • reorderHabits() batch-updates the `order` field in a single
 *     readwrite transaction without touching any other data.
 */

import type { Habit }                   from '@/domain/entities/Habit'
import type { HabitSnapshot }           from '@domain/entities/Habit'
import type { IHabitRepository }        from '@domain/interfaces/repositories'
import type { HabitId }                 from '@domain/types/shared'
import {
  idbClient,
  IDBClient,
}                                       from './IDBClient'
import {
  STORES,
  HABIT_INDEXES,
}                                       from './IDBSchema'
import type { HabitRecord }             from './IDBSchema'

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function toRecord(snapshot: HabitSnapshot): HabitRecord {
  return {
    id:                         snapshot.id,
    name:                       snapshot.name,
    nameLower:                  snapshot.name.trim().toLowerCase(),
    description:                snapshot.description,
    category:                   snapshot.category,
    frequency:                  snapshot.frequency,
    customDays:                 [...snapshot.customDays],
    color:                      snapshot.color,
    icon:                       snapshot.icon,
    targetCompletionsPerPeriod: snapshot.targetCompletionsPerPeriod,
    createdAt:                  snapshot.createdAt,
    updatedAt:                  snapshot.updatedAt,
    isArchived:                 snapshot.isArchived ? 1 : 0,
    // Preserve existing order if snapshot carries it; undefined is fine —
    // getAll() handles missing order via fallback sort.
    order:                      (snapshot as any).order,
  }
}

function toSnapshot(record: HabitRecord): HabitSnapshot {
  return {
    id:                         record.id as HabitId,
    name:                       record.name,
    description:                record.description,
    category:                   record.category as HabitSnapshot['category'],
    frequency:                  record.frequency as HabitSnapshot['frequency'],
    customDays:                 record.customDays,
    color:                      record.color,
    icon:                       record.icon,
    targetCompletionsPerPeriod: record.targetCompletionsPerPeriod,
    createdAt:                  record.createdAt,
    updatedAt:                  record.updatedAt,
    isArchived:                 record.isArchived === 1,
    // Surface order so the hook can use it without a second fetch
    order:                      record.order,
  } as HabitSnapshot & { order?: number }
}

// ─── Sort helper ──────────────────────────────────────────────────────────────

/**
 * Sort records by user-defined order, falling back to creation timestamp.
 * Records whose `order` is undefined (pre-migration rows) sort to the end,
 * then by createdAt so the list remains stable.
 */
function byOrder(a: HabitRecord, b: HabitRecord): number {
  const aOrd = a.order ?? Number.MAX_SAFE_INTEGER
  const bOrd = b.order ?? Number.MAX_SAFE_INTEGER
  if (aOrd !== bOrd) return aOrd - bOrd
  return a.createdAt.localeCompare(b.createdAt)
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class IDBHabitRepository implements IHabitRepository {

  async getAll(): Promise<Habit[]> {
    const tx    = idbClient.transaction(STORES.HABITS, 'readonly')
    const store = tx.objectStore(STORES.HABITS)
    const index = store.index(HABIT_INDEXES.BY_IS_ARCHIVED)

    const records = await IDBClient.getAll<HabitRecord>(index, IDBKeyRange.only(0))

    return records
      .sort(byOrder)
      .map((r) => Habit.fromSnapshot(toSnapshot(r)))
  }

  async getAllIncludingArchived(): Promise<Habit[]> {
    const tx    = idbClient.transaction(STORES.HABITS, 'readonly')
    const store = tx.objectStore(STORES.HABITS)

    const records = await IDBClient.getAll<HabitRecord>(store)

    return records
      .sort(byOrder)
      .map((r) => Habit.fromSnapshot(toSnapshot(r)))
  }

  async getById(id: HabitId): Promise<Habit | null> {
    const tx    = idbClient.transaction(STORES.HABITS, 'readonly')
    const store = tx.objectStore(STORES.HABITS)
    const record = await IDBClient.get<HabitRecord>(store, id)

    return record ? Habit.fromSnapshot(toSnapshot(record)) : null
  }

  async save(habit: Habit): Promise<void> {
    // Assign order = current count so new habits appear at the end
    const existing = await this.getAll()

    await idbClient.readwrite(STORES.HABITS, async (tx) => {
      const store = tx.objectStore(STORES.HABITS)
      const snapshot = habit.toSnapshot()
      const record = toRecord(snapshot)
      // Only assign order if not already set
      if (record.order === undefined) {
        record.order = existing.length
      }
      await IDBClient.put(store, record)
    })
  }

  async update(habit: Habit): Promise<void> {
    await idbClient.readwrite(STORES.HABITS, async (tx) => {
      const store  = tx.objectStore(STORES.HABITS)
      const exists = await IDBClient.get<HabitRecord>(store, habit.id)

      if (!exists) {
        throw new Error(`[IDBHabitRepository] update failed — habit "${habit.id}" not found.`)
      }

      // Preserve the existing order value through any update operation
      const snapshot = habit.toSnapshot()
      const record = toRecord(snapshot)
      record.order = exists.order   // never overwrite order via a regular update

      await IDBClient.put(store, record)
    })
  }

  async delete(id: HabitId): Promise<void> {
    await idbClient.readwrite(STORES.HABITS, async (tx) => {
      const store = tx.objectStore(STORES.HABITS)
      await IDBClient.delete(store, id)
    })
  }

  async existsByName(name: string): Promise<boolean> {
    const normalized = name.trim().toLowerCase()
    const tx    = idbClient.transaction(STORES.HABITS, 'readonly')
    const store = tx.objectStore(STORES.HABITS)
    const index = store.index(HABIT_INDEXES.BY_NAME_LOWER)

    const records = await IDBClient.getAll<HabitRecord>(
      index,
      IDBKeyRange.only(normalized),
    )

    return records.some((r) => r.isArchived === 0)
  }

  /**
   * Batch-update the `order` field for a set of habits.
   *
   * Runs inside a single readwrite transaction for atomicity.
   * Only touches the `order` field — every other field (name, streak
   * data, entries, gamification) is read from the existing record and
   * written back unchanged.
   */
  async reorderHabits(
    updates: ReadonlyArray<{ habitId: HabitId; order: number }>,
  ): Promise<void> {
    if (updates.length === 0) return

    await idbClient.readwrite(STORES.HABITS, async (tx) => {
      const store = tx.objectStore(STORES.HABITS)

      // Fetch + update each record sequentially within the transaction.
      // IDB transactions stay open as long as we keep making requests,
      // so chaining awaits here is safe.
      for (const { habitId, order } of updates) {
        const record = await IDBClient.get<HabitRecord>(store, habitId)
        if (record) {
          await IDBClient.put(store, { ...record, order })
        }
      }
    })
  }
}
