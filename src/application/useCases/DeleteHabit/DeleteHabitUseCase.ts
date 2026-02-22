/**
 * APPLICATION LAYER — DeleteHabit Use Case
 *
 * Two modes:
 *   • Hard delete: removes habit + ALL its entries (irreversible)
 *   • Archive:     marks as archived, entries preserved for history
 *
 * Business rules:
 *   • Cannot delete a habit that doesn't exist
 *   • Archive is idempotent (already archived → returns archived output, no error)
 *
 * SRP: Only responsible for the removal action and its cascades.
 * DIP: Receives repo abstractions; never touches localStorage directly.
 */

import type { IHabitRepository }         from '@domain/interfaces/repositories'
import type { IHabitEntryRepository }    from '@domain/interfaces/repositories'
import { HabitDomainError }              from '@domain/errors/HabitDomainError'
import { ok, err }                       from '@domain/types/shared'
import type { AsyncResult }              from '@domain/types/shared'
import { HabitId as mkHabitId }          from '@domain/types/shared'
import type { IClockService }            from '@application/services/IClockService'
import type {
  DeleteHabitInput,
  DeleteHabitOutput,
} from '@application/dtos/HabitDTOs'

export class DeleteHabitUseCase {
  constructor(
    private readonly habitRepo: IHabitRepository,
    private readonly entryRepo: IHabitEntryRepository,
    private readonly clock:     IClockService,
  ) {}

  async execute(input: DeleteHabitInput): AsyncResult<DeleteHabitOutput> {
    const habitId = mkHabitId(input.habitId)

    // ── 1. Ensure the habit exists ────────────────────────────────────────
    const habit = await this.habitRepo.getById(habitId)
    if (!habit) {
      return err(
        new HabitDomainError('NOT_FOUND', `Habit "${input.habitId}" not found.`),
      )
    }

    // ── 2. Archive or hard-delete ─────────────────────────────────────────
    if (input.archiveOnly) {
      // Idempotent — archive even if already archived; just no-op with success
      if (!habit.isArchived) {
        const now = this.clock.nowAsTimestamp()
        const archived = habit.archive(now)
        await this.habitRepo.update(archived)
      }

      return ok({ habitId: input.habitId, action: 'archived' })
    }

    // Hard delete — cascade to entries first, then remove the habit
    await this.entryRepo.deleteAllEntriesForHabit(habitId)
    await this.habitRepo.delete(habitId)

    return ok({ habitId: input.habitId, action: 'deleted' })
  }
}
