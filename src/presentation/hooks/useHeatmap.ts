/**
 * PRESENTATION LAYER — useHeatmap Hook
 *
 * Bridges the application-layer selectors to the UI.
 *
 * Responsibilities:
 *  • Subscribes to the habit store for entries + habits
 *  • Memoizes buildHeatmapData — recalculates only when entries or habits
 *    change by reference (not on every render)
 *  • Exposes getDayDetail for the click-to-drill-down modal
 *  • Exposes no business logic — all math lives in heatmapSelectors.ts
 *
 * Performance notes:
 *  • useMemo dependencies are [entries, habits] — both are stable arrays from
 *    Zustand; they only change reference when the store receives new data.
 *  • The selector itself is O(n) in entry count — ~365 iterations max.
 *  • getDayDetail is a useCallback so the modal doesn't re-render on unrelated
 *    state changes.
 */

import { useMemo, useCallback }                  from 'react'
import { useHabitStore }                         from '@application/stores/habitStore'
import {
  buildHeatmapData,
  getDayCompletedHabits,
}                                                from '@application/selectors/heatmapSelectors'
import type { HeatmapData, HeatmapDay }          from '@application/selectors/heatmapSelectors'
import type { HabitSnapshot }                    from '@domain/entities/Habit'

export type { HeatmapData, HeatmapDay }

export interface DayDetail {
  day:              HeatmapDay
  completedHabits:  HabitSnapshot[]
  missedHabits:     HabitSnapshot[]
}

export function useHeatmap() {
  const habits  = useHabitStore((s) => s.habits)
  const entries = useHabitStore((s) => s.entries)

  // ── Memoized heatmap dataset ───────────────────────────────────────────────
  // Only recomputes when entries or habits change by reference.
  const heatmapData: HeatmapData = useMemo(
    () => buildHeatmapData(entries as any, habits, new Date()),
    [entries, habits],
  )

  // ── Day detail (for the click modal) ─────────────────────────────────────
  const getDayDetail = useCallback(
    (dateStr: string): DayDetail | null => {
      const day = heatmapData.dayIndex.get(dateStr)
      if (!day || day.isFuture) return null

      const completedHabits = getDayCompletedHabits(entries as any, habits, dateStr)
      const completedIds    = new Set(completedHabits.map((h) => h.id))
      const missedHabits    = habits
        .filter((h) => !h.isArchived && !completedIds.has(h.id))

      return { day, completedHabits, missedHabits }
    },
    [heatmapData, entries, habits],
  )

  return {
    heatmapData,
    getDayDetail,
    hasData: habits.length > 0,
  }
}
