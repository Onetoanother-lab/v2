/**
 * INFRASTRUCTURE — IndexedDB Schema Definitions
 *
 * Single source of truth for:
 *  • Database name and current version
 *  • Object store names (typed constants avoid string typos)
 *  • Index names for each store
 *  • The exact shape of every stored record
 *
 * Versioning rules:
 *  • Increment DB_VERSION whenever a store or index is added/removed/changed
 *  • Never modify an existing version's migration — only add new ones
 *  • Migrations run in IDBClient.ts inside `onupgradeneeded`
 *
 * No domain imports here — this file is pure infrastructure vocabulary.
 */

// ─── Database identity ────────────────────────────────────────────────────────

export const DB_NAME    = 'habit-tracker-db'
export const DB_VERSION = 1

// ─── Object store names ───────────────────────────────────────────────────────

export const STORES = {
  HABITS:  'habits',
  ENTRIES: 'entries',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

// ─── Index names ──────────────────────────────────────────────────────────────

/**
 * Indexes on the `habits` store.
 * Every query pattern that isn't a direct key lookup gets an index.
 */
export const HABIT_INDEXES = {
  /** Enables efficient sort-by-creation and archived filter */
  BY_CREATED_AT:  'by_createdAt',
  /** Allows existsByName without a full table scan */
  BY_NAME_LOWER:  'by_nameLower',
  /** Allows getAll() to skip archived via IDB range (isArchived = 0 | 1) */
  BY_IS_ARCHIVED: 'by_isArchived',
} as const

/**
 * Indexes on the `entries` store.
 *
 * The compound [habitId, date] index is the most important:
 *   • hasEntryForDate  → exact match lookup:  IDBKeyRange.only([habitId, date])
 *   • getEntriesForHabitInRange → bounded range: IDBKeyRange.bound([habitId, from], [habitId, to])
 *   • getEntriesForHabit        → prefix range:  IDBKeyRange.bound([habitId], [habitId, '\uffff'])
 *
 * This collapses four separate JS-filter operations into native IDB index scans.
 */
export const ENTRY_INDEXES = {
  /** Single-field index: all entries for a date across all habits */
  BY_DATE:          'by_date',
  /** Compound index: [habitId, date] — supports habit+range queries */
  BY_HABIT_DATE:    'by_habitId_date',
} as const

// ─── Stored record shapes (what actually lives in IDB) ────────────────────────

/**
 * HabitRecord is what we PUT into IndexedDB.
 * It mirrors HabitSnapshot exactly plus one extra field:
 *   `nameLower` — a lowercase version of `name` used by the BY_NAME_LOWER index
 *   for case-insensitive existsByName queries without JS-level full scans.
 *
 * `customDays` is stored as a regular (mutable) number[] because IDB
 * cannot handle ReadonlyArray — we freeze it again on read-out.
 */
export interface HabitRecord {
  id:                          string
  name:                        string
  nameLower:                   string     // derived: name.trim().toLowerCase()
  description:                 string
  category:                    string
  frequency:                   string
  customDays:                  number[]
  color:                       string
  icon:                        string
  targetCompletionsPerPeriod:  number
  createdAt:                   string
  updatedAt:                   string
  isArchived:                  0 | 1      // IDB indexes can't compare booleans reliably
}

/**
 * EntryRecord is what we PUT into the entries store.
 * Adds `habitId_date` — a precomputed compound key value stored as a plain
 * array so the compound index [habitId, date] works naturally.
 */
export interface EntryRecord {
  id:           string
  habitId:      string
  date:         string     // YYYY-MM-DD
  completedAt:  string     // ISO-8601 timestamp
  note:         string
  /** Stored explicitly so the compound index key is always in sync */
  habitId_date: [string, string]
}
