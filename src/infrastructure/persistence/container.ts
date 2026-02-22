/**
 * INFRASTRUCTURE LAYER — Dependency Injection Container
 *
 * v2: ReorderHabitsUseCase added to the use case registry.
 */

import { RealClock, UuidIdGenerator }  from '@infrastructure/adapters/ClockAndIdServices'
import {
  idbClient,
  IDBHabitRepository,
  IDBEntryRepository,
  migrateLocalStorageToIDB,
}                                      from '@infrastructure/persistence/idb'

import { localHabitRepository }        from '@infrastructure/persistence/localHabitRepository'
import { localEntryRepository }        from '@infrastructure/persistence/localEntryRepository'

import { CreateHabitUseCase }          from '@application/useCases/CreateHabit/CreateHabitUseCase'
import { CompleteHabitUseCase }        from '@application/useCases/CompleteHabit/CompleteHabitUseCase'
import { GetHabitsUseCase }            from '@application/useCases/GetHabits/GetHabitsUseCase'
import { DeleteHabitUseCase }          from '@application/useCases/DeleteHabit/DeleteHabitUseCase'
import { GetStreakUseCase }            from '@application/useCases/GetStreak/GetStreakUseCase'
import { ReorderHabitsUseCase }        from '@application/useCases/ReorderHabits/ReorderHabitsUseCase'

import type { IHabitRepository }       from '@domain/interfaces/repositories'
import type { IHabitEntryRepository }  from '@domain/interfaces/repositories'

const PERSISTENCE_BACKEND: 'idb' | 'localStorage' = 'idb'

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
    reorderHabits: ReorderHabitsUseCase   // ← new
  }
  repositories: {
    habits:  IHabitRepository
    entries: IHabitEntryRepository
  }
}

let _container: AppContainer | null = null

export function getContainer(): AppContainer {
  if (!_container) {
    throw new Error(
      '[Container] Accessed before initialization. Await `containerReady` first.',
    )
  }
  return _container
}

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

export const containerReady: Promise<AppContainer> = (async () => {
  let habitRepo:  IHabitRepository
  let entryRepo:  IHabitEntryRepository

  if (PERSISTENCE_BACKEND === 'idb') {
    try {
      await idbClient.ready
      await migrateLocalStorageToIDB()

      habitRepo = new IDBHabitRepository()
      entryRepo = new IDBEntryRepository()

      console.info('[Container] IndexedDB repositories ready.')
    } catch (idbError) {
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

  _container = {
    useCases: {
      createHabit:   new CreateHabitUseCase(habitRepo, idGen, clock),
      completeHabit: new CompleteHabitUseCase(habitRepo, entryRepo, idGen, clock),
      getHabits:     new GetHabitsUseCase(habitRepo, entryRepo, clock),
      deleteHabit:   new DeleteHabitUseCase(habitRepo, entryRepo, clock),
      getStreak:     new GetStreakUseCase(habitRepo, entryRepo, clock),
      reorderHabits: new ReorderHabitsUseCase(habitRepo),   // ← new
    },
    repositories: {
      habits:  habitRepo,
      entries: entryRepo,
    },
  }

  return _container
})()
