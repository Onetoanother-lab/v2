/**
 * APPLICATION LAYER — CompleteHabit Use Case
 *
 * Handles toggling a habit's completion for a given date:
 *   • If no entry exists → create one ("complete")
 *   • If an entry exists → delete it ("uncomplete" / undo)
 *
 * Business rules enforced here:
 *   • Cannot log a completion for a future date
 *   • Returns the refreshed streak after the action
 *
 * SRP: Only responsible for the complete/uncomplete action.
 * DIP: Depends on abstractions — IHabitRepository, IHabitEntryRepository,
 *      IIdGenerator, IClockService — never on concrete classes.
 */

import type { HabitEntry }               from '@domain/entities/Habit'
import type { IHabitRepository }         from '@domain/interfaces/repositories'
import type { IHabitEntryRepository }    from '@domain/interfaces/repositories'
import { HabitDomainError }              from '@domain/errors/HabitDomainError'
import { calculateStreak }               from '@domain/services/StreakCalculator'
import { isHabitDueOn }                  from '@domain/services/StreakCalculator'
import { todayUTC }                      from '@domain/services/DateUtils'
import { ok, err }                       from '@domain/types/shared'
import type { AsyncResult, DateString, HabitId, EntryId } from '@domain/types/shared'
import { DateStr, HabitId as mkHabitId, EntryId as mkEntryId } from '@domain/types/shared'
import type { IIdGenerator }             from '@application/services/IIdGenerator'
import type { IClockService }            from '@application/services/IClockService'
import type {
  CompleteHabitInput,
  CompleteHabitOutput,
} from '@application/dtos/HabitDTOs'

export class CompleteHabitUseCase {
  constructor(
    private readonly habitRepo: IHabitRepository,
    private readonly entryRepo: IHabitEntryRepository,
    private readonly idGen:     IIdGenerator,
    private readonly clock:     IClockService,
  ) {}

  async execute(input: CompleteHabitInput): AsyncResult<CompleteHabitOutput> {
    const habitId = mkHabitId(input.habitId)
    const date    = DateStr(input.date ?? this.clock.todayAsDateString())
    const today   = this.clock.todayAsDateString()

    // ── 1. Fetch habit ────────────────────────────────────────────────────
    const habit = await this.habitRepo.getById(habitId)
    if (!habit) {
      return err(new HabitDomainError('NOT_FOUND', `Habit "${habitId}" not found.`))
    }

    if (habit.isArchived) {
      return err(
        new HabitDomainError('ALREADY_ARCHIVED', `Cannot log a completion for an archived habit.`),
      )
    }

    // ── 2. Validate date ──────────────────────────────────────────────────
    if (date > today) {
      return err(
        new HabitDomainError('FUTURE_DATE', `Cannot log a completion for a future date (${date}).`),
      )
    }

    // ── 3. Toggle completion ──────────────────────────────────────────────
    const existingEntry = await this.entryRepo.hasEntryForDate(habitId, date)
    let action: 'completed' | 'uncompleted'
    let entryId: EntryId

    if (existingEntry) {
      // Find the actual entry to get its ID
      const entries = await this.entryRepo.getEntriesForHabitInRange(habitId, date, date)
      const toDelete = entries[0]   // at most one entry per day per habit

      await this.entryRepo.deleteEntry(mkEntryId(toDelete.id))
      entryId = mkEntryId(toDelete.id)
      action  = 'uncompleted'
    } else {
      const now: string = this.clock.nowAsTimestamp()
      entryId = this.idGen.entryId()

      const entry: HabitEntry = {
        id:          entryId,
        habitId,
        date,
        completedAt: now,
        note:        input.note ?? '',
      }

      await this.entryRepo.saveEntry(entry)
      action = 'completed'
    }

    // ── 4. Recalculate streak ─────────────────────────────────────────────
    const allEntries = await this.entryRepo.getEntriesForHabit(habitId)
    const streak = calculateStreak(habit.toSnapshot(), allEntries, today)

    return ok({
      entryId,
      habitId,
      date,
      completedAt: this.clock.nowAsTimestamp(),
      action,
      currentStreak: streak.currentStreak,
    })
  }
}
