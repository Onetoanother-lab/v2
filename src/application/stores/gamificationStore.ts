/**
 * APPLICATION LAYER — Gamification Store
 *
 * Persists points + badges via Zustand persist middleware.
 * The store holds DERIVED state only — the source of truth is the
 * habit entry repository. This store caches the calculated result.
 *
 * Pattern: "write-through cache"
 *   • On every habit completion → recalculate points + badges → write here
 *   • On app boot → store is rehydrated from localStorage
 *   • No complex sync logic: points are always recalculated from entries
 */

import { create }   from 'zustand'
import { persist }  from 'zustand/middleware'
import type { Badge, BadgeId } from '@domain/services/GamificationEngine'
import {
  calculateLevel,
  evaluateBadges,
  checkComebackBadge,
  formatPoints,
  calculatePointsForCompletion,
  ALL_BADGES,
} from '@domain/services/GamificationEngine'
import type { HabitEntry, HabitSnapshot } from '@domain/entities/Habit'
import type { DateString } from '@domain/types/shared'

// ─── State shape ──────────────────────────────────────────────────────────────

interface GamificationState {
  totalPoints:      number
  unlockedBadges:   Badge[]
  recentlyUnlocked: Badge[]   // cleared after display
  lastUpdated:      string | null

  // ── Computed (derived from totalPoints) ────────────────────────────────
  level:           number
  levelName:       string
  levelEmoji:      string
  nextLevelPoints: number
  progressToNext:  number

  // ── Actions ────────────────────────────────────────────────────────────
  addPoints: (points: number) => void

  /**
   * Full recalculation — called after any completion toggle.
   * Evaluates all badge conditions and updates store atomically.
   */
  recalculate: (params: {
    allEntries:   ReadonlyArray<HabitEntry>
    allHabits:    ReadonlyArray<Pick<HabitSnapshot, 'id' | 'frequency' | 'category'>>
    habitStreaks: ReadonlyMap<string, number>
    today:        DateString
  }) => Badge[]   // returns newly unlocked badges

  clearRecentlyUnlocked: () => void
  reset: () => void
}

// ─── Initial computed values ──────────────────────────────────────────────────

function computedFromPoints(points: number) {
  const lvl = calculateLevel(points)
  return {
    level:           lvl.level,
    levelName:       lvl.levelName,
    levelEmoji:      lvl.levelEmoji,
    nextLevelPoints: lvl.nextLevelPoints,
    progressToNext:  lvl.progressToNext,
  }
}

const INITIAL_POINTS = 0

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      totalPoints:      INITIAL_POINTS,
      unlockedBadges:   [],
      recentlyUnlocked: [],
      lastUpdated:      null,
      ...computedFromPoints(INITIAL_POINTS),

      addPoints: (points) => {
        set((s) => {
          const newTotal = s.totalPoints + points
          return {
            totalPoints: newTotal,
            ...computedFromPoints(newTotal),
          }
        })
      },

      recalculate: ({ allEntries, allHabits, habitStreaks, today }) => {
        const existingIds = new Set(
          get().unlockedBadges.map((b) => b.id as BadgeId),
        )

        // ── Points: simple entry count × 10 base ──────────────────────────
        // (A more precise implementation stores per-entry points,
        //  but recalculating from entries keeps the store self-healing)
        let totalPoints = 0
        for (const entry of allEntries) {
          const habit = allHabits.find((h) => h.id === entry.habitId)
          const streak = habitStreaks.get(entry.habitId) ?? 0
          const pts = calculatePointsForCompletion(streak, habit?.frequency ?? 'daily')
          totalPoints += pts
        }

        // ── Badges ────────────────────────────────────────────────────────
        const maxStreak = Math.max(0, ...[...habitStreaks.values()])
        const uniqueCategories = new Set(allHabits.map((h) => h.category))
        const entryDatesPerHabit = new Map<string, DateString[]>()
        for (const e of allEntries) {
          const existing = entryDatesPerHabit.get(e.habitId) ?? []
          existing.push(e.date)
          entryDatesPerHabit.set(e.habitId, existing)
        }

        const newBadges = evaluateBadges({
          totalCompletions: allEntries.length,
          maxCurrentStreak: maxStreak,
          habitCount:       allHabits.length,
          categoryCount:    uniqueCategories.size,
          existingBadgeIds: existingIds,
          allEntries,
          today,
        })

        // Check comeback badge per habit
        for (const [_habitId, dates] of entryDatesPerHabit) {
          const sorted = [...dates].sort()
          if (checkComebackBadge(sorted as DateString[], existingIds, today)) {
            const def = ALL_BADGES.find((b) => b.id === 'comeback_kid')
            if (def && !existingIds.has('comeback_kid')) {
              newBadges.push({ ...def, unlockedAt: today })
              existingIds.add('comeback_kid')
            }
          }
        }

        set((s) => ({
          totalPoints,
          ...computedFromPoints(totalPoints),
          unlockedBadges:   [...s.unlockedBadges, ...newBadges],
          recentlyUnlocked: newBadges,
          lastUpdated:      today,
        }))

        return newBadges
      },

      clearRecentlyUnlocked: () => set({ recentlyUnlocked: [] }),

      reset: () => set({
        totalPoints:      0,
        unlockedBadges:   [],
        recentlyUnlocked: [],
        lastUpdated:      null,
        ...computedFromPoints(0),
      }),
    }),
    {
      name: 'habit-tracker-gamification-v1',
      partialize: (s) => ({
        totalPoints:    s.totalPoints,
        unlockedBadges: s.unlockedBadges,
        lastUpdated:    s.lastUpdated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recompute derived level fields after hydration
          const computed = computedFromPoints(state.totalPoints)
          Object.assign(state, computed)
        }
      },
    },
  ),
)

// ─── Convenience selector hooks ───────────────────────────────────────────────

export const usePoints       = () => useGamificationStore((s) => s.totalPoints)
export const useLevel        = () => useGamificationStore((s) => ({
  level:           s.level,
  levelName:       s.levelName,
  levelEmoji:      s.levelEmoji,
  nextLevelPoints: s.nextLevelPoints,
  progressToNext:  s.progressToNext,
}))
export const useBadges       = () => useGamificationStore((s) => s.unlockedBadges)
export const useRecentBadges = () => useGamificationStore((s) => s.recentlyUnlocked)
export const useFormattedPoints = () => useGamificationStore((s) => formatPoints(s.totalPoints))
