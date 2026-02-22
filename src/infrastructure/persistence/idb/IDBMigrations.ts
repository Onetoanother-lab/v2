/**
 * INFRASTRUCTURE — IndexedDB Migration Definitions
 *
 * Each migration function receives the upgrade transaction and the
 * previous DB version. Migrations are append-only — never modify an
 * existing migration, only add new ones for the next version number.
 *
 * Invoked by IDBClient inside the `onupgradeneeded` event handler.
 *
 * Version history:
 *   v1  — Initial schema: habits + entries stores with full index set
 */

import {
  STORES,
  HABIT_INDEXES,
  ENTRY_INDEXES,
} from './IDBSchema'

type UpgradeTx = IDBTransaction

/**
 * Run all migrations between `fromVersion` and `toVersion` in order.
 * Called once per DB open when the stored version < DB_VERSION.
 */
export function runMigrations(
  db: IDBDatabase,
  tx: UpgradeTx,
  fromVersion: number,
  toVersion: number,
): void {
  console.info(`[IDB] Migrating schema v${fromVersion} → v${toVersion}`)

  if (fromVersion < 1 && toVersion >= 1) migrateV0toV1(db, tx)

  // Future migrations follow the same pattern:
  // if (fromVersion < 2 && toVersion >= 2) migrateV1toV2(db, tx)
}

// ─── v0 → v1 : Initial schema ─────────────────────────────────────────────────

function migrateV0toV1(db: IDBDatabase, _tx: UpgradeTx): void {
  // ── habits store ────────────────────────────────────────────────────────────
  const habitStore = db.createObjectStore(STORES.HABITS, { keyPath: 'id' })

  /**
   * createdAt index — used by getAll / getAllIncludingArchived for sort.
   * Not unique (theoretically two habits created at the exact same ms),
   * though in practice IDs prevent confusion.
   */
  habitStore.createIndex(HABIT_INDEXES.BY_CREATED_AT, 'createdAt', { unique: false })

  /**
   * nameLower index — case-insensitive duplicate detection.
   * Not unique because we handle the uniqueness check in JS
   * (we only guard against non-archived duplicates).
   */
  habitStore.createIndex(HABIT_INDEXES.BY_NAME_LOWER, 'nameLower', { unique: false })

  /**
   * isArchived index — stored as 0 | 1 so IDB can compare it.
   * getAll() uses IDBKeyRange.only(0) to fetch only active habits.
   */
  habitStore.createIndex(HABIT_INDEXES.BY_IS_ARCHIVED, 'isArchived', { unique: false })

  // ── entries store ────────────────────────────────────────────────────────────
  const entryStore = db.createObjectStore(STORES.ENTRIES, { keyPath: 'id' })

  /**
   * date index — getEntriesForDate + getEntriesInRange.
   * Multiple entries can share a date (one per habit), so not unique.
   */
  entryStore.createIndex(ENTRY_INDEXES.BY_DATE, 'date', { unique: false })

  /**
   * Compound [habitId, date] index — the workhorse of the entry repository.
   *
   * IDB compound indexes work on arrays. We store the value as
   * `habitId_date: [habitId, date]` in the record.
   *
   * Supported query patterns (all native O(log n) IDB seeks):
   *   • IDBKeyRange.only([habitId, date])               → hasEntryForDate
   *   • IDBKeyRange.bound([habitId,'0000'], [habitId,'9999']) → getEntriesForHabit
   *   • IDBKeyRange.bound([habitId, from], [habitId, to])    → getEntriesForHabitInRange
   */
  entryStore.createIndex(
    ENTRY_INDEXES.BY_HABIT_DATE,
    'habitId_date',
    { unique: false, multiEntry: false },
  )

  console.info('[IDB] v1 schema created: habits + entries stores with indexes')
}
