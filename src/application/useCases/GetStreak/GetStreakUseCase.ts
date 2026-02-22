/**
 * APPLICATION LAYER — GetStreak Use Case
 *
 * Returns the full streak model for a single habit, including:
 *   • Current streak, longest streak
 *   • Completion rate over the last 30 days
 *   • A human-readable "label" string for the UI ("🔥 12-day streak!")
 *
 * Kept separate from GetHabits because:
 *   • A stats page may call it for a single habit without fetching all habits
 *   • It supports `asOf` override for historical analysis / tests
 */

import type { IHabitRepository }         from '@domain/interfaces/repositories'
import type { IHabitEntryRepository }    from '@domain/interfaces/repositories'
import { HabitDomainError }              from '@domain/errors/HabitDomainError'
import { calculateStreak }               from '@domain/services/StreakCalculator'
import { ok, err }                       from '@domain/types/shared'
import type { AsyncResult, DateString }  from '@domain/types/shared'
import { DateStr, HabitId as mkHabitId } from '@domain/types/shared'
import type { IClockService }            from '@application/services/IClockService'
import type {
  GetStreakInput,
  GetStreakOutput,
} from '@application/dtos/HabitDTOs'

export class GetStreakUseCase {
  constructor(
    private readonly habitRepo: IHabitRepository,
    private readonly entryRepo: IHabitEntryRepository,
    private readonly clock:     IClockService,
  ) {}

  async execute(input: GetStreakInput): AsyncResult<GetStreakOutput> {
    const habitId = mkHabitId(input.habitId)
    const asOf    = DateStr(input.asOf ?? this.clock.todayAsDateString())

    const habit = await this.habitRepo.getById(habitId)
    if (!habit) {
      return err(new HabitDomainError('NOT_FOUND', `Habit "${input.habitId}" not found.`))
    }

    const entries = await this.entryRepo.getEntriesForHabit(habitId)
    const streak  = calculateStreak(habit.toSnapshot(), entries, asOf)

    return ok({
      habitId:                  habit.id,
      currentStreak:            streak.currentStreak,
      longestStreak:            streak.longestStreak,
      lastCompletedDate:        streak.lastCompletedDate,
      completionRateLastMonth:  streak.completionRateLastMonth,
      totalCompletions:         streak.totalCompletions,
      label:                    buildStreakLabel(streak.currentStreak, habit.frequency),
    })
  }
}

// ─── Label builder ────────────────────────────────────────────────────────────

function buildStreakLabel(streak: number, frequency: string): string {
  if (streak === 0) return 'Start your streak today!'
  if (streak === 1) return '1 day streak — keep going!'

  const unit = frequency === 'weekly' ? 'week' : 'day'
  const plural = streak === 1 ? unit : `${unit}s`

  if (streak >= 100) return `🏆 ${streak}-${unit} streak — legendary!`
  if (streak >= 30)  return `🌟 ${streak}-${plural} streak — incredible!`
  if (streak >= 14)  return `🔥 ${streak}-${plural} streak — on fire!`
  if (streak >= 7)   return `💪 ${streak}-${plural} streak — great work!`
  return `✨ ${streak}-${plural} streak — building momentum!`
}
