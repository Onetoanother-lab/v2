/**
 * INFRASTRUCTURE — IndexedDB Migration Definitions
 *
 * Version history:
 *   v1 — Initial schema: habits + entries stores with full index set
 *   v2 — Add `order` field to every habit record (user-defined drag order)
 */

import {
  STORES,
  HABIT_INDEXES,
  ENTRY_INDEXES,
} from './IDBSchema'
import type { HabitRecord } from './IDBSchema'

type UpgradeTx = IDBTransaction

export function runMigrations(
  db: IDBDatabase,
  tx: UpgradeTx,
  fromVersion: number,
  toVersion: number,
): void {
  console.info(`[IDB] Migrating schema v${fromVersion} → v${toVersion}`)

  if (fromVersion < 1 && toVersion >= 1) migrateV0toV1(db, tx)
  if (fromVersion < 2 && toVersion >= 2) migrateV1toV2(tx)
}

// ─── v0 → v1 : Initial schema ─────────────────────────────────────────────────

function migrateV0toV1(db: IDBDatabase, _tx: UpgradeTx): void {
  const habitStore = db.createObjectStore(STORES.HABITS, { keyPath: 'id' })
  habitStore.createIndex(HABIT_INDEXES.BY_CREATED_AT, 'createdAt', { unique: false })
  habitStore.createIndex(HABIT_INDEXES.BY_NAME_LOWER, 'nameLower', { unique: false })
  habitStore.createIndex(HABIT_INDEXES.BY_IS_ARCHIVED, 'isArchived', { unique: false })

  const entryStore = db.createObjectStore(STORES.ENTRIES, { keyPath: 'id' })
  entryStore.createIndex(ENTRY_INDEXES.BY_DATE, 'date', { unique: false })
  entryStore.createIndex(
    ENTRY_INDEXES.BY_HABIT_DATE,
    'habitId_date',
    { unique: false, multiEntry: false },
  )

  console.info('[IDB] v1 schema created: habits + entries stores with indexes')
}

// ─── v1 → v2 : Add `order` field to every existing habit ──────────────────────

/**
 * Reads all habits from the store, sorts them by createdAt, then writes
 * back each record with an `order` integer (0, 1, 2, …).
 *
 * This runs inside the versionchange transaction — the IDB spec guarantees
 * that cursor operations within the same transaction are sequential, so no
 * async coordination is needed.  We open a cursor and chain updates via
 * cursor.continue(), which is the idiomatic IDB approach.
 */
function migrateV1toV2(tx: UpgradeTx): void {
  const store = tx.objectStore(STORES.HABITS)

  // Step 1: collect all records
  const getAllReq = store.getAll()

  getAllReq.onsuccess = () => {
    const records = (getAllReq.result as HabitRecord[])
      .slice()   // don't mutate the result array
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    // Step 2: write back each record with its new order value
    records.forEach((record, index) => {
      store.put({ ...record, order: index })
    })

    console.info(`[IDB] v2 migration: assigned order to ${records.length} habits`)
  }
}
