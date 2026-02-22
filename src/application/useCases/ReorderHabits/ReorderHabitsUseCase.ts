/**
 * APPLICATION LAYER — ReorderHabits Use Case
 *
 * Accepts the new sorted array of habit IDs and persists their positions.
 *
 * ─── Architecture notes ───────────────────────────────────────────────────────
 * SRP: Only responsible for persisting order. No streak, gamification, or
 *   completion logic runs here.
 *
 * DIP: Depends on IHabitRepository — never on the concrete IDB class.
 *
 * Atomicity: The repository implementation uses a single readwrite IDB
 *   transaction so either ALL positions are saved or NONE are (no partial state).
 *
 * Optimistic UI: The presentation layer applies arrayMove() immediately on
 *   DragEnd, then calls this use case in the background. If it fails, the
 *   hook re-fetches habits from the repository, snapping back to the last
 *   known-good order.
 *
 * Streak / gamification safety: `reorderHabits` on the repository only writes
 *   the `order` field — every other field is read from the existing record and
 *   written back unchanged. Streaks, entries, and badge state are never touched.
 */

import type { IHabitRepository }  from '@domain/interfaces/repositories'
import { HabitId as mkHabitId }   from '@domain/types/shared'
import { ok, err }                from '@domain/types/shared'
import type { AsyncResult }       from '@domain/types/shared'
import { HabitDomainError }       from '@domain/errors/HabitDomainError'

export interface ReorderHabitsInput {
  /**
   * The full ordered array of habit IDs in the NEW desired order.
   * Position in array = new `order` value (0-based index).
   */
  orderedIds: string[]
}

export interface ReorderHabitsOutput {
  /** Number of habits whose order was updated */
  updatedCount: number
}

export class ReorderHabitsUseCase {
  constructor(private readonly habitRepo: IHabitRepository) {}

  async execute(input: ReorderHabitsInput): AsyncResult<ReorderHabitsOutput> {
    if (input.orderedIds.length === 0) {
      return ok({ updatedCount: 0 })
    }

    try {
      const updates = input.orderedIds.map((id, index) => ({
        habitId: mkHabitId(id),
        order:   index,
      }))

      await this.habitRepo.reorderHabits(updates)

      return ok({ updatedCount: updates.length })
    } catch (e) {
      return err(
        new HabitDomainError(
          'NOT_FOUND',
          `Failed to persist habit order: ${e instanceof Error ? e.message : String(e)}`,
        ),
      )
    }
  }
}
