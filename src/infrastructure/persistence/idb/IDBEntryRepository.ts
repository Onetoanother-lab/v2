/**
 * INFRASTRUCTURE — IndexedDB Habit Entry Repository
 *
 * Implements IHabitEntryRepository using IndexedDB.
 *
 * ─── Index strategy ────────────────────────────────────────────────────────────
 *
 * The compound index `by_habitId_date` over the array field `habitId_date`
 * is the foundation of every efficient query here.
 *
 * How compound array indexes work in IDB:
 *   Record stored:     { ..., habitId_date: ["h-1", "2024-01-15"] }
 *   Index key path:    "habitId_date"  (points to the array field)
 *   IDB index key:     ["h-1", "2024-01-15"]
 *
 * Query patterns:
 *
 *   hasEntryForDate(habitId, date):
 *     IDBKeyRange.only(["h-1", "2024-01-15"])  → exact match count
 *
 *   getEntriesForHabit(habitId):
 *     IDBKeyRange.bound(["h-1", ""], ["h-1", "\uffff"])
 *     → all entries where habitId === "h-1", any date
 *
 *   getEntriesForHabitInRange(habitId, from, to):
 *     IDBKeyRange.bound(["h-1", from], ["h-1", to])
 *     → entries for habitId "h-1" with date in [from, to]
 *
 *   deleteAllEntriesForHabit(habitId):
 *     Cursor over IDBKeyRange.bound(["h-1",""], ["h-1","\uffff"]) with cursor.delete()
 *     → deletes directly in IDB without loading into JS
 *
 * All other methods (getEntriesForDate, getEntriesInRange) use the simpler
 * `by_date` single-field index.
 *
 * ─── Record ↔ HabitEntry mapping ──────────────────────────────────────────────
 * HabitEntry  ──► toRecord()   ──► EntryRecord  (stored in IDB)
 * EntryRecord ──► toHabitEntry() ──► HabitEntry (returned to application)
 */

import type { HabitEntry }              from '@domain/entities/Habit'
import type { IHabitEntryRepository }   from '@domain/interfaces/repositories'
import type { HabitId, EntryId, DateString } from '@domain/types/shared'
import {
  idbClient,
  IDBClient,
}                                       from './IDBClient'
import {
  STORES,
  ENTRY_INDEXES,
}                                       from './IDBSchema'
import type { EntryRecord }             from './IDBSchema'

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function toRecord(entry: HabitEntry): EntryRecord {
  return {
    id:           entry.id,
    habitId:      entry.habitId,
    date:         entry.date,
    completedAt:  entry.completedAt,
    note:         entry.note,
    habitId_date: [entry.habitId, entry.date],
  }
}

function toHabitEntry(record: EntryRecord): HabitEntry {
  return {
    id:          record.id,
    habitId:     record.habitId as HabitId,
    date:        record.date    as DateString,
    completedAt: record.completedAt,
    note:        record.note,
  }
}

// ─── Key range builders ───────────────────────────────────────────────────────

/**
 * Build a key range that matches all compound keys starting with habitId.
 * Uses "" as lower date bound and "\uffff" (highest unicode char) as upper.
 * This is the standard IDB prefix-scan pattern for compound indexes.
 */
function habitIdRange(habitId: string): IDBKeyRange {
  return IDBKeyRange.bound([habitId, ''], [habitId, '\uffff'])
}

function habitIdDateRange(
  habitId: string,
  from: string,
  to: string,
): IDBKeyRange {
  return IDBKeyRange.bound([habitId, from], [habitId, to])
}

// ─── Repository implementation ────────────────────────────────────────────────

export class IDBEntryRepository implements IHabitEntryRepository {

  async getEntriesForHabit(habitId: HabitId): Promise<HabitEntry[]> {
    const tx      = idbClient.transaction(STORES.ENTRIES, 'readonly')
    const store   = tx.objectStore(STORES.ENTRIES)
    const index   = store.index(ENTRY_INDEXES.BY_HABIT_DATE)
    const records = await IDBClient.getAll<EntryRecord>(index, habitIdRange(habitId))

    // IDB returns in index key order ([habitId, date]), so already sorted by date asc
    return records.map(toHabitEntry)
  }

  async getEntriesForDate(date: DateString): Promise<HabitEntry[]> {
    const tx      = idbClient.transaction(STORES.ENTRIES, 'readonly')
    const store   = tx.objectStore(STORES.ENTRIES)
    const index   = store.index(ENTRY_INDEXES.BY_DATE)
    const records = await IDBClient.getAll<EntryRecord>(index, IDBKeyRange.only(date))

    return records.map(toHabitEntry)
  }

  async getEntriesForHabitInRange(
    habitId: HabitId,
    from: DateString,
    to: DateString,
  ): Promise<HabitEntry[]> {
    const tx      = idbClient.transaction(STORES.ENTRIES, 'readonly')
    const store   = tx.objectStore(STORES.ENTRIES)
    const index   = store.index(ENTRY_INDEXES.BY_HABIT_DATE)
    const records = await IDBClient.getAll<EntryRecord>(
      index,
      habitIdDateRange(habitId, from, to),
    )

    return records.map(toHabitEntry)
  }

  async getEntriesInRange(from: DateString, to: DateString): Promise<HabitEntry[]> {
    const tx      = idbClient.transaction(STORES.ENTRIES, 'readonly')
    const store   = tx.objectStore(STORES.ENTRIES)
    const index   = store.index(ENTRY_INDEXES.BY_DATE)
    const records = await IDBClient.getAll<EntryRecord>(
      index,
      IDBKeyRange.bound(from, to),
    )

    return records.map(toHabitEntry)
  }

  async saveEntry(entry: HabitEntry): Promise<void> {
    await idbClient.readwrite(STORES.ENTRIES, async (tx) => {
      const store = tx.objectStore(STORES.ENTRIES)
      await IDBClient.put(store, toRecord(entry))
    })
  }

  async deleteEntry(id: EntryId): Promise<void> {
    await idbClient.readwrite(STORES.ENTRIES, async (tx) => {
      const store = tx.objectStore(STORES.ENTRIES)
      await IDBClient.delete(store, id)
    })
  }

  async hasEntryForDate(habitId: HabitId, date: DateString): Promise<boolean> {
    const tx    = idbClient.transaction(STORES.ENTRIES, 'readonly')
    const store = tx.objectStore(STORES.ENTRIES)
    const index = store.index(ENTRY_INDEXES.BY_HABIT_DATE)

    // Exact lookup: compound key must be exactly [habitId, date]
    const count = await IDBClient.count(index, IDBKeyRange.only([habitId, date]))
    return count > 0
  }

  async getEntryById(id: EntryId): Promise<HabitEntry | null> {
    const tx     = idbClient.transaction(STORES.ENTRIES, 'readonly')
    const store  = tx.objectStore(STORES.ENTRIES)
    const record = await IDBClient.get<EntryRecord>(store, id)

    return record ? toHabitEntry(record) : null
  }

  async deleteAllEntriesForHabit(habitId: HabitId): Promise<void> {
    await idbClient.readwrite(STORES.ENTRIES, async (tx) => {
      const store = tx.objectStore(STORES.ENTRIES)
      const index = store.index(ENTRY_INDEXES.BY_HABIT_DATE)

      // Cursor-based bulk delete — removes records directly in IDB
      // without loading the full array into JS memory
      const deleted = await IDBClient.cursorDelete(index, habitIdRange(habitId))
      console.debug(`[IDBEntryRepository] Deleted ${deleted} entries for habit ${habitId}`)
    })
  }
}
