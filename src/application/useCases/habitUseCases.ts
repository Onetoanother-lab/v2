/**
 * APPLICATION LAYER — Use Case Barrel
 *
 * Re-exports all use case classes from their individual folders.
 * Import from here to avoid deeply nested import paths in consuming code.
 *
 * Usage:
 *   import { CreateHabitUseCase } from '@application/useCases/habitUseCases'
 */

export { CreateHabitUseCase }   from './CreateHabit/CreateHabitUseCase'
export { CompleteHabitUseCase } from './CompleteHabit/CompleteHabitUseCase'
export { GetHabitsUseCase }     from './GetHabits/GetHabitsUseCase'
export { DeleteHabitUseCase }   from './DeleteHabit/DeleteHabitUseCase'
export { GetStreakUseCase }      from './GetStreak/GetStreakUseCase'
