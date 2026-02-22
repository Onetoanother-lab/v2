/**
 * INFRASTRUCTURE — IndexedDB Habit Repository
 *
 * Implements IHabitRepository using IndexedDB as the backing store.
 *
 * ─── DIP in action ────────────────────────────────────────────────────────────
 * The domain layer defined the interface (IHabitRepository).
 * This file implements it. No domain or application code was changed.
 * The container wires this in at startup — use cases never know the difference.
 *
 * ─── Record ↔ Snapshot mapping ────────────────────────────────────────────────
 * HabitSnapshot (domain) ──► toRecord() ──► HabitRecord (stored in IDB)
 * HabitRecord    (IDB)   ──► toSnapshot() ──► HabitSnapshot ──► Habit.fromSnapshot()
 *
 * The extra fields (nameLower, isArchived as 0|1) are stripped on read-out
 * so the domain never sees them.
 *
 * ─── Query patterns and their index usage ─────────────────────────────────────
 * getAll()                → BY_IS_ARCHIVED index, range only(0), sorted in JS
 * getAllIncludingArchived()→ full store scan, sorted in JS by createdAt
 * getById()               → primary key direct lookup  O(log n)
 * save()                  → put (insert)               O(log n)
 * update()                → put (overwrite)            O(log n)
 * delete()                → delete by key              O(log n)
 * existsByName()          → BY_NAME_LOWER index count  O(log n)
 */

import { Habit }                        from '@domain/entities/Habit'
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

/**
 * Convert a domain HabitSnapshot to the IDB-storable HabitRecord.
 * Adds computed fields that support indexed queries.
 */
function toRecord(snapshot: HabitSnapshot): HabitRecord {
  return {
    id:                         snapshot.id,
    name:                       snapshot.name,
    nameLower:                  snapshot.name.trim().toLowerCase(),
    description:                snapshot.description,
    category:                   snapshot.category,
    frequency:                  snapshot.frequency,
    customDays:                 [...snapshot.customDays],   // ReadonlyArray → mutable for IDB
    color:                      snapshot.color,
    icon:                       snapshot.icon,
    targetCompletionsPerPeriod: snapshot.targetCompletionsPerPeriod,
    createdAt:                  snapshot.createdAt,
    updatedAt:                  snapshot.updatedAt,
    isArchived:                 snapshot.isArchived ? 1 : 0,
  }
}

/**
 * Convert a stored HabitRecord back to a HabitSnapshot for the domain.
 * Strips IDB-specific fields (nameLower, boolean coercion).
 */
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
  }
}

// ─── Repository implementation ────────────────────────────────────────────────

export class IDBHabitRepository implements IHabitRepository {
  // All methods are standalone and stateless — the client manages the connection

  async getAll(): Promise<Habit[]> {
    const tx     = idbClient.transaction(STORES.HABITS, 'readonly')
    const store  = tx.objectStore(STORES.HABITS)
    const index  = store.index(HABIT_INDEXES.BY_IS_ARCHIVED)

    // IDBKeyRange.only(0) fetches only active (non-archived) habits
    const records = await IDBClient.getAll<HabitRecord>(
      index,
      IDBKeyRange.only(0),
    )

    return records
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((r) => Habit.fromSnapshot(toSnapshot(r)))
  }

  async getAllIncludingArchived(): Promise<Habit[]> {
    const tx    = idbClient.transaction(STORES.HABITS, 'readonly')
    const store = tx.objectStore(STORES.HABITS)

    const records = await IDBClient.getAll<HabitRecord>(store)

    return records
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((r) => Habit.fromSnapshot(toSnapshot(r)))
  }

  async getById(id: HabitId): Promise<Habit | null> {
    const tx     = idbClient.transaction(STORES.HABITS, 'readonly')
    const store  = tx.objectStore(STORES.HABITS)
    const record = await IDBClient.get<HabitRecord>(store, id)

    return record ? Habit.fromSnapshot(toSnapshot(record)) : null
  }

  async save(habit: Habit): Promise<void> {
    await idbClient.readwrite(STORES.HABITS, async (tx) => {
      const store = tx.objectStore(STORES.HABITS)
      await IDBClient.put(store, toRecord(habit.toSnapshot()))
    })
  }

  async update(habit: Habit): Promise<void> {
    await idbClient.readwrite(STORES.HABITS, async (tx) => {
      const store  = tx.objectStore(STORES.HABITS)
      const exists = await IDBClient.get<HabitRecord>(store, habit.id)

      if (!exists) {
        throw new Error(`[IDBHabitRepository] update failed — habit "${habit.id}" not found.`)
      }

      await IDBClient.put(store, toRecord(habit.toSnapshot()))
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
    const tx         = idbClient.transaction(STORES.HABITS, 'readonly')
    const store      = tx.objectStore(STORES.HABITS)
    const index      = store.index(HABIT_INDEXES.BY_NAME_LOWER)

    // Fetch all records with this exact lowercased name
    const records = await IDBClient.getAll<HabitRecord>(
      index,
      IDBKeyRange.only(normalized),
    )

    // Only active (non-archived) habits count as duplicates
    return records.some((r) => r.isArchived === 0)
  }
}
