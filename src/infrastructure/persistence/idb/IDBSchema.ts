/**
 * INFRASTRUCTURE — IndexedDB Schema Definitions
 *
 * v2 changes:
 *   • HabitRecord gets `order: number` — the user-defined drag sort index.
 *     Stored as a plain integer; sorted ASC in getAll().
 *     Not indexed (we load all habits anyway; a full-store scan + JS sort
 *     is faster than an IDB range scan over a low-cardinality number).
 */

export const DB_NAME    = 'habit-tracker-db'
export const DB_VERSION = 2   // bumped: adds order field to habits

export const STORES = {
  HABITS:  'habits',
  ENTRIES: 'entries',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

export const HABIT_INDEXES = {
  BY_CREATED_AT:  'by_createdAt',
  BY_NAME_LOWER:  'by_nameLower',
  BY_IS_ARCHIVED: 'by_isArchived',
} as const

export const ENTRY_INDEXES = {
  BY_DATE:       'by_date',
  BY_HABIT_DATE: 'by_habitId_date',
} as const

// ─── Stored record shapes ─────────────────────────────────────────────────────

export interface HabitRecord {
  id:                          string
  name:                        string
  nameLower:                   string
  description:                 string
  category:                    string
  frequency:                   string
  customDays:                  number[]
  color:                       string
  icon:                        string
  targetCompletionsPerPeriod:  number
  createdAt:                   string
  updatedAt:                   string
  isArchived:                  0 | 1
  /**
   * User-defined display order (0-based index).
   * Optional for backward compat with records written before v2.
   * getAll() sorts by `order ASC`, falling back to `createdAt ASC` for
   * records where order is undefined (e.g. after a failed migration).
   */
  order?: number
}

export interface EntryRecord {
  id:           string
  habitId:      string
  date:         string
  completedAt:  string
  note:         string
  habitId_date: [string, string]
}
