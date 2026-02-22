/**
 * APPLICATION LAYER — UpdateHabit Use Case
 *
 * Allows updating a habit's name, category, tags, color, and icon.
 * Does NOT touch entries, streaks, or completion data.
 *
 * Validation handled here (domain layer, not UI):
 *   • Name: 1–100 chars
 *   • Tags: normalised, deduplicated, max 10
 *   • Color: valid hex or omitted
 *   • Category: must be in HABIT_CATEGORIES
 *
 * The gamification store is NOT invalidated here — category changes
 * don't affect badge counts (which are evaluated on completion).
 */

import type { IHabitRepository }            from '@domain/repositories/IHabitRepository'
import type { HabitSnapshot, UpdateHabitDTO } from '@domain/entities/Habit'
import {
  HABIT_CATEGORIES,
  HABIT_CONSTRAINTS,
  validateTags,
} from '@domain/entities/Habit'
import type { Result } from '@domain/types/Result'

interface UpdateHabitInput {
  id:          string
  name?:       string
  category?:   string
  frequency?:  string
  customDays?: number[]
  tags?:       string[]
  color?:      string
  icon?:       string
}

interface UpdateHabitOutput {
  habit: HabitSnapshot
}

export class UpdateHabitUseCase {
  constructor(
    private readonly habitRepo: IHabitRepository,
    private readonly getSnapshotForHabit: (id: string) => Promise<HabitSnapshot | null>,
  ) {}

  async execute(input: UpdateHabitInput): Promise<Result<UpdateHabitOutput>> {
    // ── Validate name ────────────────────────────────────────────────────
    if (input.name !== undefined) {
      const trimmed = input.name.trim()
      if (trimmed.length < HABIT_CONSTRAINTS.NAME_MIN || trimmed.length > HABIT_CONSTRAINTS.NAME_MAX) {
        return { success: false, error: `Name must be ${HABIT_CONSTRAINTS.NAME_MIN}–${HABIT_CONSTRAINTS.NAME_MAX} characters` }
      }
    }

    // ── Validate category ─────────────────────────────────────────────────
    if (input.category !== undefined) {
      if (!(HABIT_CATEGORIES as readonly string[]).includes(input.category)) {
        return { success: false, error: `Invalid category: ${input.category}` }
      }
    }

    // ── Validate tags ─────────────────────────────────────────────────────
    let validatedTags: string[] | undefined
    if (input.tags !== undefined) {
      const result = validateTags(input.tags)
      if (!result.valid) return { success: false, error: result.error }
      validatedTags = result.tags
    }

    // ── Validate color ────────────────────────────────────────────────────
    if (input.color !== undefined && input.color !== '') {
      if (!HABIT_CONSTRAINTS.COLOR_PATTERN.test(input.color)) {
        return { success: false, error: 'Color must be a valid hex code (e.g. #22c55e)' }
      }
    }

    // ── Validate icon ─────────────────────────────────────────────────────
    if (input.icon !== undefined) {
      const chars = [...input.icon]
      if (chars.length > HABIT_CONSTRAINTS.ICON_MAX_LEN) {
        return { success: false, error: 'Icon must be a single emoji or up to 4 characters' }
      }
    }

    // ── Build DTO ─────────────────────────────────────────────────────────
    const dto: UpdateHabitDTO = { id: input.id }
    if (input.name     !== undefined) dto.name       = input.name.trim()
    if (input.category !== undefined) dto.category   = input.category as any
    if (input.frequency !== undefined) dto.frequency = input.frequency as any
    if (input.customDays !== undefined) dto.customDays = input.customDays
    if (validatedTags  !== undefined) dto.tags        = validatedTags
    if (input.color    !== undefined) dto.color       = input.color || undefined  // empty string → remove
    if (input.icon     !== undefined) dto.icon        = input.icon  || undefined

    // ── Persist ───────────────────────────────────────────────────────────
    try {
      await this.habitRepo.update(dto)
      const snapshot = await this.getSnapshotForHabit(input.id)
      if (!snapshot) return { success: false, error: 'Habit not found after update' }
      return { success: true, data: { habit: snapshot } }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }
}
