/**
 * APPLICATION LAYER — GetHabits Use Case
 *
 * Retrieves habits for a given date, enriched with:
 *   • Whether the habit is due on that date (via FrequencyStrategy)
 *   • Whether it was completed on that date
 *   • Current streak, longest streak, completion rate
 *
 * This use case is the primary "read" path for the Habits list page.
 *
 * SRP: Only responsible for assembling the HabitSummary view model.
 * OCP: Adding new fields to HabitSummary does not require changing the
 *      calling page or the domain — only this class and the DTO.
 */

import type { IHabitRepository }         from '@domain/interfaces/repositories'
import type { IHabitEntryRepository }    from '@domain/interfaces/repositories'
import { calculateStreak }               from '@domain/services/StreakCalculator'
import { FrequencyStrategyFactory }      from '@domain/services/FrequencyStrategy'
import { ok }                            from '@domain/types/shared'
import type { AsyncResult, DateString, HabitId } from '@domain/types/shared'
import { DateStr, HabitId as mkHabitId } from '@domain/types/shared'
import type { IClockService }            from '@application/services/IClockService'
import type {
  GetHabitsInput,
  GetHabitsOutput,
  HabitSummary,
} from '@application/dtos/HabitDTOs'

export class GetHabitsUseCase {
  constructor(
    private readonly habitRepo: IHabitRepository,
    private readonly entryRepo: IHabitEntryRepository,
    private readonly clock:     IClockService,
  ) {}

  async execute(input: GetHabitsInput = {}): AsyncResult<GetHabitsOutput> {
    const forDate = DateStr(input.forDate ?? this.clock.todayAsDateString())

    // ── 1. Fetch raw habits ────────────────────────────────────────────────
    const habits = input.includeArchived
      ? await this.habitRepo.getAllIncludingArchived()
      : await this.habitRepo.getAll()

    // ── 2. Fetch all entries for today (single query, not N queries) ───────
    const todayEntries  = await this.entryRepo.getEntriesForDate(forDate)
    const completedIds  = new Set(todayEntries.map((e) => e.habitId))

    // ── 3. Enrich each habit ──────────────────────────────────────────────
    const summaries = await Promise.all(
      habits.map(async (habit): Promise<HabitSummary> => {
        const snapshot  = habit.toSnapshot()
        const strategy  = FrequencyStrategyFactory.create(snapshot)

        // Fetch all entries for this habit (for streak calculation)
        // In production this is cached / batched; here it's kept simple
        const allEntries = await this.entryRepo.getEntriesForHabit(
          habit.id as HabitId,
        )

        const streak = calculateStreak(snapshot, allEntries, forDate)

        return {
          id:                       habit.id,
          name:                     habit.name,
          description:              habit.description,
          category:                 habit.category,
          frequency:                habit.frequency,
          customDays:               [...habit.customDays],
          color:                    habit.color,
          icon:                     habit.icon,
          target:                   habit.target,
          scheduleDescription:      strategy.describe(),
          isArchived:               habit.isArchived,
          isDueToday:               strategy.isDueOn(forDate),
          isCompletedToday:         completedIds.has(habit.id),
          currentStreak:            streak.currentStreak,
          longestStreak:            streak.longestStreak,
          completionRateLastMonth:  streak.completionRateLastMonth,
          totalCompletions:         streak.totalCompletions,
          lastCompletedDate:        streak.lastCompletedDate,
          createdAt:                habit.createdAt,
        }
      }),
    )

    // ── 4. Compute aggregate stats ────────────────────────────────────────
    const dueToday       = summaries.filter((h) => h.isDueToday)
    const completedToday = summaries.filter((h) => h.isCompletedToday && h.isDueToday)

    return ok({
      habits:                      summaries,
      totalDueToday:               dueToday.length,
      totalCompletedToday:         completedToday.length,
      overallCompletionRateToday:  dueToday.length > 0
        ? completedToday.length / dueToday.length
        : 0,
    })
  }
}
