/**
 * APPLICATION LAYER — CreateHabit Use Case
 *
 * ─── SOLID Principles Applied ────────────────────────────────────────────────
 *
 * SRP: This class has exactly one reason to change — the business rule
 *   for creating a habit changes. Nothing else.
 *
 * OCP: New validation rules are added in the Habit entity, not here.
 *   New persistence mechanisms are added in the repository, not here.
 *
 * DIP: Depends on IHabitRepository and IIdGenerator abstractions.
 *   The constructor receives them — never imports concrete classes.
 *
 * ─── Flow ────────────────────────────────────────────────────────────────────
 *   Input DTO → validate → build Habit aggregate → persist → return output DTO
 */

import { Habit }                       from '@domain/entities/Habit'
import type { IHabitRepository }       from '@domain/interfaces/repositories'
import { HabitDomainError }            from '@domain/errors/HabitDomainError'
import { FrequencyStrategyFactory }    from '@domain/services/FrequencyStrategy'
import { ok, err }                     from '@domain/types/shared'
import type { AsyncResult }            from '@domain/types/shared'
import type { IIdGenerator }           from '@application/services/IIdGenerator'
import type { IClockService }          from '@application/services/IClockService'
import type {
  CreateHabitInput,
  CreateHabitOutput,
} from '@application/dtos/HabitDTOs'

export class CreateHabitUseCase {
  constructor(
    private readonly habitRepo:  IHabitRepository,
    private readonly idGen:      IIdGenerator,
    private readonly clock:      IClockService,
  ) {}

  async execute(input: CreateHabitInput): AsyncResult<CreateHabitOutput> {
    try {
      // ── 1. Guard: duplicate name check ───────────────────────────────────
      const nameExists = await this.habitRepo.existsByName(input.name.trim())
      if (nameExists) {
        return err(
          new HabitDomainError(
            'INVALID_NAME',
            `A habit named "${input.name.trim()}" already exists.`,
          ),
        )
      }

      // ── 2. Build the aggregate (all invariant checks happen inside Habit.create) ─
      const id  = this.idGen.habitId()
      const now = this.clock.nowAsTimestamp()

      const habit = Habit.create(
        {
          name:                       input.name,
          description:                input.description ?? '',
          category:                   input.category,
          frequency:                  input.frequency,
          customDays:                 input.customDays ?? [],
          color:                      input.color,
          icon:                       input.icon ?? '✅',
          targetCompletionsPerPeriod: input.targetCompletionsPerPeriod ?? 1,
        },
        id,
        now,
      )

      // ── 3. Persist ────────────────────────────────────────────────────────
      await this.habitRepo.save(habit)

      // ── 4. Build output DTO ───────────────────────────────────────────────
      const output: CreateHabitOutput = {
        id:                  habit.id,
        name:                habit.name,
        description:         habit.description,
        category:            habit.category,
        frequency:           habit.frequency,
        customDays:          [...habit.customDays],
        color:               habit.color,
        icon:                habit.icon,
        target:              habit.target,
        scheduleDescription: FrequencyStrategyFactory.describe(habit.toSnapshot()),
        createdAt:           habit.createdAt,
      }

      return ok(output)
    } catch (e) {
      // Re-wrap known domain errors; let unknown errors propagate typed
      if (e instanceof HabitDomainError) return err(e)
      throw e
    }
  }
}
