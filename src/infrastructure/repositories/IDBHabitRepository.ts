/**
 * INFRASTRUCTURE LAYER — IndexedDB Habit Repository (Phase 3)
 *
 * Migration strategy:
 *   IDB version bumped from 1 → 2.
 *   onupgradeneeded handles both:
 *     • Fresh install (version 0 → 2)
 *     • Existing install upgrade (version 1 → 2)
 *
 *   For existing habits during upgrade, the migration adds
 *   `tags: []`, `color: undefined`, `icon: undefined`
 *   to every existing record so they match the new shape.
 *   This is a READ-time migration — IDB stores JS objects,
 *   so we simply write back the extended object.
 *
 * New features:
 *   • habits store: tags (multiEntry index), color, icon fields
 *   • getAllTags()        — uses IDB index cursor over 'tags'
 *   • getActiveCategories() — iterates habits and collects unique categories
 *   • update()           — patched write that preserves entry count / streak data
 *   • findAll() filter   — IDB-side filtering on category, JS-side on tags
 *
 * Architecture note:
 *   ALL business logic (streak calc, completion rate) lives in use cases.
 *   This file is pure persistence — it only reads/writes raw Habit records.
 */

import type { IHabitRepository, GetHabitsOptions } from '@domain/repositories/IHabitRepository'
import type {
  Habit,
  HabitEntry,
  CreateHabitDTO,
  UpdateHabitDTO,
  HabitCategory,
} from '@domain/entities/Habit'
import { HABIT_CATEGORIES, normaliseTag } from '@domain/entities/Habit'

const DB_NAME    = 'habitual-db'
const DB_VERSION = 2   // bumped from 1

// ─── IDB schema ───────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db  = req.result
      const txn = req.transaction!

      // ── Create habits store (fresh install) ──────────────────────────────
      if (!db.objectStoreNames.contains('habits')) {
        const habitsStore = db.createObjectStore('habits', { keyPath: 'id' })
        habitsStore.createIndex('by_category', 'category', { unique: false })
        habitsStore.createIndex('by_archived', 'archivedAt', { unique: false })
        // multiEntry: true allows querying individual tags from an array field
        habitsStore.createIndex('by_tag', 'tags', { unique: false, multiEntry: true })
      } else if (event.oldVersion < 2) {
        // ── Upgrade existing habits store (v1 → v2) ───────────────────────
        const habitsStore = txn.objectStore('habits')

        // Add the new by_tag multiEntry index (didn't exist in v1)
        if (!habitsStore.indexNames.contains('by_tag')) {
          habitsStore.createIndex('by_tag', 'tags', { unique: false, multiEntry: true })
        }

        // Migrate existing records: add missing fields with safe defaults
        const cursorReq = habitsStore.openCursor()
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result
          if (!cursor) return
          const record = cursor.value as Habit
          const updated: Habit = {
            ...record,
            tags:  record.tags  ?? [],
            color: record.color ?? undefined,
            icon:  record.icon  ?? undefined,
          }
          cursor.update(updated)
          cursor.continue()
        }
      }

      // ── Create entries store (fresh install) ──────────────────────────────
      if (!db.objectStoreNames.contains('entries')) {
        const entriesStore = db.createObjectStore('entries', { keyPath: 'id' })
        entriesStore.createIndex('by_habit',   'habitId', { unique: false })
        entriesStore.createIndex('by_date',    'date',    { unique: false })
        entriesStore.createIndex('by_habit_date', ['habitId', 'date'], { unique: true })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function withStore<T>(
  mode: IDBTransactionMode,
  storeName: string,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db    = await openDB()
  const txn   = db.transaction(storeName, mode)
  const store = txn.objectStore(storeName)
  const req   = fn(store)
  if (req instanceof Promise) return req
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

function idbAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

function idbAllByIndex<T>(
  store: IDBObjectStore,
  indexName: string,
  key: IDBValidKey | IDBKeyRange,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.index(indexName).getAll(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ─── Tag filtering (JS-side) ──────────────────────────────────────────────────

function matchesTags(habit: Habit, tags: string[], mode: 'any' | 'all'): boolean {
  if (!tags.length) return true
  const habitTags = habit.tags ?? []
  if (mode === 'all') return tags.every((t) => habitTags.includes(t))
  return tags.some((t) => habitTags.includes(t))
}

// ─── Repository implementation ────────────────────────────────────────────────

export class IDBHabitRepository implements IHabitRepository {
  // ── Read ──────────────────────────────────────────────────────────────────

  async findAll(options: GetHabitsOptions = {}): Promise<Habit[]> {
    const { includeArchived = false, category, tags = [], tagMode = 'any' } = options
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const txn   = db.transaction('habits', 'readonly')
      const store = txn.objectStore('habits')
      let req: IDBRequest<Habit[]>

      // Use IDB category index when filtering by a single category
      if (category) {
        req = store.index('by_category').getAll(category) as IDBRequest<Habit[]>
      } else {
        req = store.getAll() as IDBRequest<Habit[]>
      }

      req.onsuccess = () => {
        let habits = req.result as Habit[]

        // Filter archived (IDB doesn't do null checks natively)
        if (!includeArchived) {
          habits = habits.filter((h) => !h.archivedAt)
        }

        // Tag filter (JS-side — multiEntry index used only for getAllTags)
        if (tags.length) {
          habits = habits.filter((h) => matchesTags(h, tags, tagMode))
        }

        resolve(habits)
      }
      req.onerror = () => reject(req.error)
    })
  }

  async findById(id: string): Promise<Habit | null> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction('habits', 'readonly').objectStore('habits').get(id)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => reject(req.error)
    })
  }

  /**
   * Exploit the multiEntry index to collect every unique tag efficiently.
   * openKeyCursor iterates the index — each key IS a tag string.
   */
  async getAllTags(): Promise<string[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const txn   = db.transaction('habits', 'readonly')
      const index = txn.objectStore('habits').index('by_tag')
      const tags  = new Set<string>()
      const req   = index.openKeyCursor()

      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) {
          resolve([...tags].sort())
          return
        }
        tags.add(cursor.key as string)
        cursor.continue()
      }
      req.onerror = () => reject(req.error)
    })
  }

  async getActiveCategories(): Promise<HabitCategory[]> {
    const habits = await this.findAll({ includeArchived: false })
    const cats   = new Set(habits.map((h) => h.category))
    // Return in canonical order (from HABIT_CATEGORIES) not insertion order
    return HABIT_CATEGORIES.filter((c) => cats.has(c)) as HabitCategory[]
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  async create(dto: CreateHabitDTO): Promise<Habit> {
    const habit: Habit = {
      id:         generateId(),
      name:       dto.name.trim(),
      category:   dto.category,
      frequency:  dto.frequency,
      customDays: dto.customDays,
      tags:       dto.tags ?? [],
      color:      dto.color,
      icon:       dto.icon,
      createdAt:  new Date().toISOString(),
      archivedAt: null,
    }

    await withStore('readwrite', 'habits', (s) => s.put(habit))
    return habit
  }

  async update(dto: UpdateHabitDTO): Promise<Habit> {
    const existing = await this.findById(dto.id)
    if (!existing) throw new Error(`Habit ${dto.id} not found`)

    const updated: Habit = {
      ...existing,
      ...(dto.name       !== undefined && { name:       dto.name.trim() }),
      ...(dto.category   !== undefined && { category:   dto.category }),
      ...(dto.frequency  !== undefined && { frequency:  dto.frequency }),
      ...(dto.customDays !== undefined && { customDays: dto.customDays }),
      ...(dto.tags       !== undefined && { tags:       dto.tags }),
      ...(dto.color      !== undefined && { color:      dto.color }),
      ...(dto.icon       !== undefined && { icon:       dto.icon }),
    }

    await withStore('readwrite', 'habits', (s) => s.put(updated))
    return updated
  }

  async delete(id: string): Promise<void> {
    await withStore('readwrite', 'habits', (s) => s.delete(id))
  }

  async archive(id: string): Promise<void> {
    const h = await this.findById(id)
    if (!h) return
    await withStore('readwrite', 'habits', (s) => s.put({ ...h, archivedAt: new Date().toISOString() }))
  }

  async restore(id: string): Promise<void> {
    const h = await this.findById(id)
    if (!h) return
    await withStore('readwrite', 'habits', (s) => s.put({ ...h, archivedAt: null }))
  }

  // ── Entries ───────────────────────────────────────────────────────────────

  async findEntriesForDate(date: string): Promise<HabitEntry[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction('entries', 'readonly').objectStore('entries').index('by_date').getAll(date)
      req.onsuccess = () => resolve(req.result)
      req.onerror   = () => reject(req.error)
    })
  }

  async findEntriesForHabit(habitId: string, fromDate?: string): Promise<HabitEntry[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction('entries', 'readonly').objectStore('entries').index('by_habit').getAll(habitId)
      req.onsuccess = () => {
        let entries = req.result as HabitEntry[]
        if (fromDate) entries = entries.filter((e) => e.date >= fromDate)
        resolve(entries.sort((a, b) => a.date.localeCompare(b.date)))
      }
      req.onerror = () => reject(req.error)
    })
  }

  async findAllEntries(): Promise<HabitEntry[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction('entries', 'readonly').objectStore('entries').getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror   = () => reject(req.error)
    })
  }

  async createEntry(habitId: string, date: string): Promise<HabitEntry> {
    const entry: HabitEntry = {
      id:          generateId(),
      habitId,
      date,
      completedAt: new Date().toISOString(),
    }
    await withStore('readwrite', 'entries', (s) => s.put(entry))
    return entry
  }

  async deleteEntry(habitId: string, date: string): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const txn   = db.transaction('entries', 'readwrite')
      const index = txn.objectStore('entries').index('by_habit_date')
      const req   = index.openCursor(IDBKeyRange.only([habitId, date]))
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) cursor.delete()
        resolve()
      }
      req.onerror = () => reject(req.error)
    })
  }

  async entryExists(habitId: string, date: string): Promise<boolean> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const req = db
        .transaction('entries', 'readonly')
        .objectStore('entries')
        .index('by_habit_date')
        .count(IDBKeyRange.only([habitId, date]))
      req.onsuccess = () => resolve(req.result > 0)
      req.onerror   = () => reject(req.error)
    })
  }
}
