/**
 * INFRASTRUCTURE LAYER — Dependency Injection Container
 *
 * ─── Composition Root ────────────────────────────────────────────────────────
 * The single place where every abstraction is bound to its concrete implementation.
 * This is the ONLY file that knows both sides of the dependency wall.
 *
 * ─── Switching storage backends ───────────────────────────────────────────────
 * localStorage → IndexedDB: change PERSISTENCE_BACKEND below, nothing else.
 * IndexedDB    → REST API:  add a new repository class, swap it in here.
 * Domain, application, and presentation layers: untouched.
 *
 * ─── Async initialization ─────────────────────────────────────────────────────
 * IndexedDB.open() is async. The container exposes a `containerReady` promise
 * that resolves only after:
 *   1. The IDB connection is open
 *   2. Schema migrations have run
 *   3. Legacy localStorage data has been imported (once, on upgrade)
 *   4. All use case instances are wired up
 *
 * main.tsx awaits `containerReady` before mounting React.
 * This guarantees no use case ever fires against an unopened database.
 */

import { RealClock, UuidIdGenerator }  from '@infrastructure/adapters/ClockAndIdServices'
import {
  idbClient,
  IDBHabitRepository,
  IDBEntryRepository,
  migrateLocalStorageToIDB,
}                                      from '@infrastructure/persistence/idb'

// Kept available as a fallback and for unit tests that run outside a browser
import { localHabitRepository }        from '@infrastructure/persistence/localHabitRepository'
import { localEntryRepository }        from '@infrastructure/persistence/localEntryRepository'

import { CreateHabitUseCase }          from '@application/useCases/CreateHabit/CreateHabitUseCase'
import { CompleteHabitUseCase }        from '@application/useCases/CompleteHabit/CompleteHabitUseCase'
import { GetHabitsUseCase }            from '@application/useCases/GetHabits/GetHabitsUseCase'
import { DeleteHabitUseCase }          from '@application/useCases/DeleteHabit/DeleteHabitUseCase'
import { GetStreakUseCase }            from '@application/useCases/GetStreak/GetStreakUseCase'

import type { IHabitRepository }       from '@domain/interfaces/repositories'
import type { IHabitEntryRepository }  from '@domain/interfaces/repositories'

// ─── Backend selector ─────────────────────────────────────────────────────────

/**
 * Switch the persistence layer here.
 * 'idb'          — IndexedDB (production, persists across reloads)
 * 'localStorage' — localStorage (fallback, simpler but size-limited)
 */
const PERSISTENCE_BACKEND: 'idb' | 'localStorage' = 'idb'

// ─── Shared service singletons ────────────────────────────────────────────────

const clock = new RealClock()
const idGen  = new UuidIdGenerator()

// ─── Container shape ──────────────────────────────────────────────────────────

export interface AppContainer {
  useCases: {
    createHabit:   CreateHabitUseCase
    completeHabit: CompleteHabitUseCase
    getHabits:     GetHabitsUseCase
    deleteHabit:   DeleteHabitUseCase
    getStreak:     GetStreakUseCase
  }
  repositories: {
    habits:  IHabitRepository
    entries: IHabitEntryRepository
  }
}

// ─── Lazy container — populated by containerReady ─────────────────────────────

let _container: AppContainer | null = null

/**
 * Access the wired container.
 * Throws if called before `containerReady` has resolved — this is intentional.
 * Always await `containerReady` in main.tsx before mounting the app.
 */
export function getContainer(): AppContainer {
  if (!_container) {
    throw new Error(
      '[Container] Accessed before initialization. Await `containerReady` first.',
    )
  }
  return _container
}

/** Convenience accessors — mirrors the previous exported `useCases` and `repositories` */
export const useCases = new Proxy({} as AppContainer['useCases'], {
  get(_target, prop) {
    return getContainer().useCases[prop as keyof AppContainer['useCases']]
  },
})

export const repositories = new Proxy({} as AppContainer['repositories'], {
  get(_target, prop) {
    return getContainer().repositories[prop as keyof AppContainer['repositories']]
  },
})

export type UseCases = AppContainer['useCases']

// ─── Async initialization ─────────────────────────────────────────────────────

/**
 * `containerReady` is the Promise main.tsx awaits before mounting React.
 *
 * Sequence:
 *  1. If IDB backend: await idbClient.ready (open + run schema migrations)
 *  2. If IDB backend: run one-time localStorage → IDB data migration
 *  3. Wire repositories to use cases
 *  4. Resolve → React mounts
 */
export const containerReady: Promise<AppContainer> = (async () => {
  let habitRepo:  IHabitRepository
  let entryRepo:  IHabitEntryRepository

  if (PERSISTENCE_BACKEND === 'idb') {
    try {
      // Step 1: Wait for IDB to open and all schema migrations to run
      await idbClient.ready

      // Step 2: One-time import of existing localStorage data (idempotent)
      await migrateLocalStorageToIDB()

      habitRepo = new IDBHabitRepository()
      entryRepo = new IDBEntryRepository()

      console.info('[Container] IndexedDB repositories ready.')
    } catch (idbError) {
      // IDB unavailable (private browsing, storage quota, etc.)
      // Fall back gracefully to localStorage so the app still works
      console.warn(
        '[Container] IndexedDB unavailable — falling back to localStorage.',
        idbError,
      )
      habitRepo = localHabitRepository
      entryRepo = localEntryRepository
    }
  } else {
    habitRepo = localHabitRepository
    entryRepo = localEntryRepository
    console.info('[Container] localStorage repositories ready.')
  }

  // Step 3: Wire use cases — this is the only place constructor args are bound
  _container = {
    useCases: {
      createHabit:   new CreateHabitUseCase(habitRepo, idGen, clock),
      completeHabit: new CompleteHabitUseCase(habitRepo, entryRepo, idGen, clock),
      getHabits:     new GetHabitsUseCase(habitRepo, entryRepo, clock),
      deleteHabit:   new DeleteHabitUseCase(habitRepo, entryRepo, clock),
      getStreak:     new GetStreakUseCase(habitRepo, entryRepo, clock),
    },
    repositories: {
      habits:  habitRepo,
      entries: entryRepo,
    },
  }

  return _container
})()


