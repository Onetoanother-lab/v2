/**
 * INFRASTRUCTURE — LocalStorage → IndexedDB Data Migration
 *
 * Runs once on first launch after switching from localStorage to IndexedDB.
 * Reads existing data from the old localStorage keys and writes it into IDB.
 * On completion, marks the migration done so it never runs again.
 *
 * Isolated entirely in the infrastructure layer — domain and application
 * layers are completely unaware this migration exists.
 *
 * Safety properties:
 *  • Idempotent: checks a migration-complete flag before running
 *  • Non-destructive: leaves localStorage data intact (user can roll back)
 *  • Atomic: uses a single IDB readwrite transaction across both stores
 *  • Silent: logs results but never throws to the caller
 */

import type { HabitSnapshot }  from '@domain/entities/Habit'
import type { HabitEntry }     from '@domain/entities/Habit'
import type { HabitRecord, EntryRecord } from './IDBSchema'
import { STORES }              from './IDBSchema'
import { idbClient, IDBClient } from './IDBClient'

// ─── localStorage key constants (match Phase 1 repo keys) ────────────────────

const LS_HABITS_KEY  = 'habit-tracker:habits-v2'
const LS_ENTRIES_KEY = 'habit-tracker:entries-v2'
const LS_MIGRATED_FLAG = 'habit-tracker:idb-migrated-v1'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MigrationResult {
  habitsImported:  number
  entriesImported: number
  skipped:         boolean
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once at app startup, after `idbClient.ready` resolves.
 * Silently no-ops if the migration was already completed.
 */
export async function migrateLocalStorageToIDB(): Promise<MigrationResult> {
  // Guard: skip if already migrated
  if (localStorage.getItem(LS_MIGRATED_FLAG) === 'done') {
    return { habitsImported: 0, entriesImported: 0, skipped: true }
  }

  const habitSnapshots  = readLocalStorageJSON<HabitSnapshot[]>(LS_HABITS_KEY)  ?? []
  const entrySnapshots  = readLocalStorageJSON<HabitEntry[]>(LS_ENTRIES_KEY)    ?? []

  if (habitSnapshots.length === 0 && entrySnapshots.length === 0) {
    // Nothing to migrate — mark complete and return
    localStorage.setItem(LS_MIGRATED_FLAG, 'done')
    console.info('[Migration] No localStorage data found — nothing to migrate.')
    return { habitsImported: 0, entriesImported: 0, skipped: false }
  }

  console.info(
    `[Migration] Importing ${habitSnapshots.length} habits + ${entrySnapshots.length} entries from localStorage → IndexedDB`,
  )

  // Perform the import in a single readwrite transaction across both stores
  await idbClient.readwrite([STORES.HABITS, STORES.ENTRIES], async (tx) => {
    const habitStore = tx.objectStore(STORES.HABITS)
    const entryStore = tx.objectStore(STORES.ENTRIES)

    // Write habits
    for (const snapshot of habitSnapshots) {
      const record: HabitRecord = {
        id:                         snapshot.id,
        name:                       snapshot.name,
        nameLower:                  snapshot.name.trim().toLowerCase(),
        description:                snapshot.description ?? '',
        category:                   snapshot.category,
        frequency:                  snapshot.frequency,
        customDays:                 [...(snapshot.customDays ?? [])],
        color:                      snapshot.color,
        icon:                       snapshot.icon,
        targetCompletionsPerPeriod: snapshot.targetCompletionsPerPeriod ?? 1,
        createdAt:                  snapshot.createdAt,
        updatedAt:                  snapshot.updatedAt,
        isArchived:                 (snapshot.isArchived as unknown as boolean) ? 1 : 0,
      }
      await IDBClient.put(habitStore, record)
    }

    // Write entries
    for (const entry of entrySnapshots) {
      const record: EntryRecord = {
        id:           entry.id,
        habitId:      entry.habitId,
        date:         entry.date,
        completedAt:  entry.completedAt,
        note:         (entry as any).note ?? '',
        habitId_date: [entry.habitId, entry.date],
      }
      await IDBClient.put(entryStore, record)
    }
  })

  // Mark migration complete
  localStorage.setItem(LS_MIGRATED_FLAG, 'done')

  console.info(
    `[Migration] ✓ Imported ${habitSnapshots.length} habits + ${entrySnapshots.length} entries into IndexedDB`,
  )

  return {
    habitsImported:  habitSnapshots.length,
    entriesImported: entrySnapshots.length,
    skipped:         false,
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readLocalStorageJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    console.warn(`[Migration] Failed to parse localStorage key "${key}"`)
    return null
  }
}
