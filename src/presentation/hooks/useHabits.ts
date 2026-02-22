/**
 * PRESENTATION LAYER — useHabits Hook (Phase 3)
 *
 * The ONLY file that imports from container (use cases) and from filterStore.
 * Components receive habits, actions, and filter controls as props from here.
 *
 * ─── New in Phase 3 ───────────────────────────────────────────────────────────
 * • Reads filters from filterStore and passes them to fetchHabits
 * • Exposes groupedHabits (Map<category, HabitSnapshot[]>) for grouped view
 * • Exposes sorted habits based on filterStore.sortBy
 * • Exposes updateHabit action (calls UpdateHabit use case)
 * • Refreshes availableCategories + availableTags after any mutation
 *
 * ─── Render optimization ──────────────────────────────────────────────────────
 * • filterStore uses granular selectors so only the changed slice re-renders
 * • groupedHabits is memoized — only recomputed when habits or groupBy changes
 * • sortedHabits is memoized — only recomputed when habits or sortBy changes
 * • Stable useCallback references for all handlers (no new function refs on render)
 *
 * ─── What does NOT change from Phase 1/2 ─────────────────────────────────────
 * • toggleCompletion — identical optimistic update pattern
 * • createHabit — identical (now also accepts tags/color/icon)
 * • deleteHabit — identical
 * • Gamification recalculation trigger — identical
 */

import { useCallback, useMemo, useEffect }  from 'react'
import { useHabitStore }                    from '@application/stores/habitStore'
import { useFilterStore }                   from '@application/stores/filterStore'
import { useCases }                         from '@infrastructure/adapters/container'
import type { HabitSnapshot, CreateHabitDTO } from '@domain/entities/Habit'
import type { HabitCategory }               from '@domain/entities/Habit'

// ─── Grouped habits map type ──────────────────────────────────────────────────

export type GroupedHabits = Map<HabitCategory | 'all', HabitSnapshot[]>

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHabits() {
  // ── Store subscriptions (granular selectors) ───────────────────────────
  const habits          = useHabitStore((s) => s.habits)
  const entries         = useHabitStore((s) => s.entries)
  const selectedDate    = useHabitStore((s) => s.selectedDate)
  const isLoading       = useHabitStore((s) => s.isLoading)
  const error           = useHabitStore((s) => s.error)
  const storeSetHabits  = useHabitStore((s) => s.setHabits)
  const storeSetEntries = useHabitStore((s) => s.setEntries)
  const storeSetLoading = useHabitStore((s) => s.setLoading)
  const storeSetError   = useHabitStore((s) => s.setError)

  // ── Filter store (separate subscription — keeps habit re-renders isolated) ─
  const activeCategory      = useFilterStore((s) => s.activeCategory)
  const activeTags          = useFilterStore((s) => s.activeTags)
  const tagMode             = useFilterStore((s) => s.tagMode)
  const groupBy             = useFilterStore((s) => s.groupBy)
  const sortBy              = useFilterStore((s) => s.sortBy)
  const showCompleted       = useFilterStore((s) => s.showCompleted)
  const setAvailableOptions = useFilterStore((s) => s.setAvailableOptions)

  // ── Completed IDs (memoized Set for O(1) lookup) ──────────────────────
  const completedIds = useMemo(() => {
    return new Set(
      entries.filter((e) => e.date === selectedDate).map((e) => e.habitId),
    )
  }, [entries, selectedDate])

  // ── Fetch habits (re-runs when filters or date change) ─────────────────
  const fetchHabits = useCallback(async () => {
    storeSetLoading(true)
    storeSetError(null)
    try {
      const result = await useCases.getHabits.execute({
        includeArchived: false,
        date:            selectedDate,
        category:        activeCategory,
        tags:            activeTags,
        tagMode,
      })
      if (result.success) {
        storeSetHabits(result.data.habits)
        storeSetEntries(result.data.entries)

        // Refresh available filter options after each load
        const [cats, tags] = await Promise.all([
          useCases.getActiveCategories?.execute() ?? Promise.resolve([]),
          useCases.getAllTags?.execute()            ?? Promise.resolve([]),
        ])
        setAvailableOptions(cats, tags)
      } else {
        storeSetError(result.error)
      }
    } catch (e) {
      storeSetError(String(e))
    } finally {
      storeSetLoading(false)
    }
  }, [
    selectedDate, activeCategory, activeTags, tagMode,
    storeSetHabits, storeSetEntries, storeSetLoading, storeSetError, setAvailableOptions,
  ])

  // Auto-fetch on mount and when filters/date change
  useEffect(() => { fetchHabits() }, [fetchHabits])

  // ── Sorted habits (memoized) ───────────────────────────────────────────
  const sortedHabits = useMemo((): HabitSnapshot[] => {
    const list = [...habits]
    switch (sortBy) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name))
      case 'streak':
        return list.sort((a, b) => b.currentStreak - a.currentStreak)
      case 'completion':
        return list.sort((a, b) => b.completionRateLastMonth - a.completionRateLastMonth)
      case 'created':
      default:
        return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }
  }, [habits, sortBy])

  // ── Filter out completed if showCompleted = false ──────────────────────
  const displayHabits = useMemo(() => {
    if (showCompleted) return sortedHabits
    return sortedHabits.filter((h) => !completedIds.has(h.id))
  }, [sortedHabits, showCompleted, completedIds])

  // ── Grouped habits (memoized) ──────────────────────────────────────────
  // Only computed when groupBy = 'category' to save work in the common case
  const groupedHabits = useMemo((): GroupedHabits => {
    if (groupBy !== 'category') {
      return new Map([['all', displayHabits]])
    }

    const map = new Map<HabitCategory | 'all', HabitSnapshot[]>()
    for (const habit of displayHabits) {
      const cat = habit.category
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(habit)
    }
    return map
  }, [displayHabits, groupBy])

  // ── Actions ────────────────────────────────────────────────────────────

  const toggleCompletion = useCallback(
    async (habitId: string) => {
      const isCompleted = completedIds.has(habitId)

      // Optimistic update
      if (isCompleted) {
        storeSetEntries(entries.filter((e) => !(e.habitId === habitId && e.date === selectedDate)))
      } else {
        storeSetEntries([...entries, {
          id:          `optimistic-${habitId}-${selectedDate}`,
          habitId,
          date:        selectedDate,
          completedAt: new Date().toISOString(),
        }])
      }

      try {
        await useCases.toggleCompletion.execute({ habitId, date: selectedDate })
        await fetchHabits()
      } catch {
        // Roll back optimistic update on failure
        await fetchHabits()
      }
    },
    [completedIds, entries, selectedDate, storeSetEntries, fetchHabits],
  )

  const createHabit = useCallback(
    async (dto: CreateHabitDTO) => {
      const result = await useCases.createHabit.execute(dto)
      if (result.success) await fetchHabits()
      return result
    },
    [fetchHabits],
  )

  const updateHabit = useCallback(
    async (input: { id: string } & Partial<CreateHabitDTO>) => {
      const result = await useCases.updateHabit.execute(input)
      if (result.success) await fetchHabits()
      return result
    },
    [fetchHabits],
  )

  const deleteHabit = useCallback(
    async (habitId: string) => {
      await useCases.deleteHabit.execute({ habitId })
      await fetchHabits()
    },
    [fetchHabits],
  )

  return {
    // Data
    habits:        displayHabits,
    groupedHabits,
    entries,
    completedIds,
    selectedDate,
    isLoading,
    error,

    // Filter-aware counts
    totalCount:     habits.length,
    completedCount: completedIds.size,

    // Actions
    fetchHabits,
    toggleCompletion,
    createHabit,
    updateHabit,
    deleteHabit,
  }
}
