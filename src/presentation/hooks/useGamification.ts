/**
 * PRESENTATION LAYER — useGamification Hook
 *
 * Wires gamification store to UI. Called after every habit toggle.
 * Returns stable selectors to prevent unnecessary re-renders.
 *
 * Usage pattern:
 *   const { triggerRecalculation, recentBadges, clearRecent } = useGamification()
 *   // After a habit completion:
 *   await triggerRecalculation()
 */

import { useCallback } from 'react'
import { useGamificationStore } from '@application/stores/gamificationStore'
import { useCases }             from '@infrastructure/adapters/container'
import { useHabitStore }        from '@application/stores/habitStore'
import type { DateString }      from '@domain/types/shared'

export function useGamification() {
  const recalculate        = useGamificationStore((s) => s.recalculate)
  const clearRecent        = useGamificationStore((s) => s.clearRecentlyUnlocked)
  const totalPoints        = useGamificationStore((s) => s.totalPoints)
  const level              = useGamificationStore((s) => s.level)
  const levelName          = useGamificationStore((s) => s.levelName)
  const levelEmoji         = useGamificationStore((s) => s.levelEmoji)
  const progressToNext     = useGamificationStore((s) => s.progressToNext)
  const nextLevelPoints    = useGamificationStore((s) => s.nextLevelPoints)
  const unlockedBadges     = useGamificationStore((s) => s.unlockedBadges)
  const recentlyUnlocked   = useGamificationStore((s) => s.recentlyUnlocked)
  const selectedDate       = useHabitStore((s) => s.selectedDate)

  /**
   * Fetch all entries and habits from use cases, then recalculate.
   * Call this after any habit completion toggle.
   */
  const triggerRecalculation = useCallback(async () => {
    try {
      // Fetch all habits with streaks
      const habitsResult = await useCases.getHabits.execute({ includeArchived: false })
      if (!habitsResult.success) return []

      const habits = habitsResult.data.habits

      // Build streak map
      const habitStreaks = new Map<string, number>(
        habits.map((h) => [h.id, h.currentStreak]),
      )

      // We need raw entries — fetch from the store's loaded state
      const storeEntries = useHabitStore.getState().entries

      const newBadges = recalculate({
        allEntries:   storeEntries as any,
        allHabits:    habits as any,
        habitStreaks,
        today:        selectedDate as DateString,
      })

      return newBadges
    } catch {
      return []
    }
  }, [recalculate, selectedDate])

  return {
    // Points & level
    totalPoints,
    level,
    levelName,
    levelEmoji,
    progressToNext,
    nextLevelPoints,

    // Badges
    unlockedBadges,
    recentlyUnlocked,

    // Actions
    triggerRecalculation,
    clearRecentBadges: clearRecent,
  }
}
