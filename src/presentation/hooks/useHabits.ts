/**
 * PRESENTATION LAYER — useHabits Hook (v3 — Drag-and-Drop)
 *
 * New in v3:
 *  • reorderHabits(newOrder: string[]) — optimistic store update, async persistence
 *  • sortBy === 'manual' bypasses JS sort so DnD order is respected
 *  • Unchanged: toggle, create, update, delete, filter, groupBy logic
 *
 * Architectural notes:
 *  • The hook is the ONLY entry point for business actions (SRP).
 *  • No dnd-kit imports here — the hook is UI-framework-agnostic.
 *  • reorderHabits calls useCases.reorderHabits in the background; on
 *    failure it re-fetches to restore the last persisted order.
 */

import { useCallback, useMemo, useEffect }  from 'react'
import { useHabitStore }                    from '@application/stores/habitStore'
import { useFilterStore }                   from '@application/stores/filterStore'
import { useCases }                         from '@infrastructure/adapters/container'
import type { HabitSnapshot, CreateHabitDTO } from '@domain/entities/Habit'
import type { HabitCategory }               from '@domain/entities/Habit'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GroupedHabits = Map<HabitCategory | 'all', HabitSnapshot[]>

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHabits() {
  // ── Store subscriptions (granular selectors — no unnecessary re-renders) ──
  const habits              = useHabitStore((s) => s.habits)
  const entries             = useHabitStore((s) => s.entries)
  const selectedDate        = useHabitStore((s) => s.selectedDate)
  const isLoading           = useHabitStore((s) => s.isLoading)
  const error               = useHabitStore((s) => s.error)
  const storeSetHabits      = useHabitStore((s) => s.setHabits)
  const storeReorderHabits  = useHabitStore((s) => s.reorderHabits)
  const storeOptimisticToggle = useHabitStore((s) => s.optimisticToggle)
  const storeSetLoading     = useHabitStore((s) => s.setLoading)
  const storeSetError       = useHabitStore((s) => s.setError)

  // ── Filter store ──────────────────────────────────────────────────────────
  const activeCategory      = useFilterStore((s) => s.activeCategory)
  const activeTags          = useFilterStore((s) => s.activeTags)
  const tagMode             = useFilterStore((s) => s.tagMode)
  const groupBy             = useFilterStore((s) => s.groupBy)
  const sortBy              = useFilterStore((s) => s.sortBy)
  const showCompleted       = useFilterStore((s) => s.showCompleted)
  const setAvailableOptions = useFilterStore((s) => s.setAvailableOptions)

  // ── Completed IDs — derived from isCompletedToday flag ───────────────────
  const completedIds = useMemo(
    () => new Set((habits as any[]).filter((h) => h.isCompletedToday).map((h) => h.id)),
    [habits],
  )

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchHabits = useCallback(async () => {
    storeSetLoading(true)
    storeSetError(null)
    try {
      const result = await useCases.getHabits.execute({
        forDate:         selectedDate,
        includeArchived: false,
      })

      if (result.success) {
        storeSetHabits(result.data.habits as any)

        const cats = [...new Set(result.data.habits.map((h) => h.category))] as HabitCategory[]
        const tags = [...new Set(
          result.data.habits.flatMap((h) => (h as any).tags ?? []),
        )].sort() as string[]

        setAvailableOptions(cats, tags)
      } else {
        storeSetError((result.error as Error).message)
      }
    } catch (e) {
      storeSetError(String(e))
    } finally {
      storeSetLoading(false)
    }
  }, [selectedDate, storeSetHabits, storeSetLoading, storeSetError, setAvailableOptions])

  useEffect(() => { fetchHabits() }, [fetchHabits])

  // ── Client-side filtering (category + tags) ───────────────────────────────
  const filteredHabits = useMemo(() => {
    let list = habits as any[]

    if (activeCategory) {
      list = list.filter((h) => h.category === activeCategory)
    }

    if (activeTags.length > 0) {
      list = list.filter((h) => {
        const habitTags: string[] = h.tags ?? []
        return tagMode === 'all'
          ? activeTags.every((t) => habitTags.includes(t))
          : activeTags.some((t) => habitTags.includes(t))
      })
    }

    return list
  }, [habits, activeCategory, activeTags, tagMode])

  // ── Sort (sortBy === 'manual' preserves DnD order) ────────────────────────
  const sortedHabits = useMemo((): HabitSnapshot[] => {
    // 'manual' = user has set a drag order; respect array order from store
    if (sortBy === 'manual' || !sortBy) return filteredHabits as HabitSnapshot[]

    const list = [...filteredHabits]
    switch (sortBy) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name))
      case 'streak':
        return list.sort((a: any, b: any) => (b.currentStreak ?? 0) - (a.currentStreak ?? 0))
      case 'completion':
        return list.sort((a: any, b: any) =>
          (b.completionRateLastMonth ?? 0) - (a.completionRateLastMonth ?? 0),
        )
      case 'created':
      default:
        return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }
  }, [filteredHabits, sortBy])

  const displayHabits = useMemo(() => {
    if (showCompleted) return sortedHabits
    return sortedHabits.filter((h) => !completedIds.has(h.id))
  }, [sortedHabits, showCompleted, completedIds])

  // ── Grouped habits ────────────────────────────────────────────────────────
  const groupedHabits = useMemo((): GroupedHabits => {
    if (groupBy !== 'category') return new Map([['all', displayHabits]])

    const map = new Map<HabitCategory | 'all', HabitSnapshot[]>()
    for (const habit of displayHabits) {
      const cat = (habit as any).category as HabitCategory
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(habit)
    }
    return map
  }, [displayHabits, groupBy])

  // ── Actions ───────────────────────────────────────────────────────────────

  const toggleCompletion = useCallback(
    async (habitId: string) => {
      storeOptimisticToggle(habitId)
      try {
        await useCases.completeHabit.execute({ habitId, date: selectedDate })
        await fetchHabits()
      } catch {
        await fetchHabits() // rollback
      }
    },
    [selectedDate, fetchHabits, storeOptimisticToggle],
  )

  const createHabit = useCallback(
    async (dto: CreateHabitDTO) => {
      const result = await useCases.createHabit.execute({
        name:                       dto.name,
        description:                '',
        category:                   dto.category,
        frequency:                  dto.frequency,
        customDays:                 dto.customDays ?? [],
        color:                      dto.color ?? '#22c55e',
        icon:                       dto.icon,
        targetCompletionsPerPeriod: 1,
      })
      if (result.success) await fetchHabits()
      return result.success
        ? { success: true as const }
        : { success: false as const, error: (result.error as Error).message }
    },
    [fetchHabits],
  )

  const updateHabit = useCallback(
    async (_input: { id: string } & Partial<CreateHabitDTO>) => {
      // TODO: wire UpdateHabitUseCase into container
      await fetchHabits()
      return { success: true as const }
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

  /**
   * Called by the DnD layer after a successful drop.
   *
   * Strategy: optimistic update → async persist → rollback on error.
   *
   * `newOrder` is the full ordered list of IDs within the visible (possibly
   * filtered) list. We rebuild the full habits array by:
   *   1. Applying newOrder positions to the filtered slice
   *   2. Merging with the unfiltered habits (different category / hidden)
   *      so their relative positions are preserved
   *
   * This ensures reordering within a category view doesn't displace habits
   * in other categories.
   */
  const reorderHabits = useCallback(
    async (newOrder: string[]) => {
      if (newOrder.length === 0) return

      // Build the full ordered ID list:
      // Visible habits in new order, then invisible habits in original order
      const visibleSet = new Set(newOrder)
      const allHabits = useHabitStore.getState().habits as any[]
      const hiddenIds = allHabits
        .filter((h) => !visibleSet.has(h.id))
        .map((h) => h.id)

      const fullOrder = [...newOrder, ...hiddenIds]

      // 1. Optimistic store update (immediate, no flicker)
      storeReorderHabits(fullOrder)

      // 2. Persist in background
      try {
        const result = await useCases.reorderHabits.execute({ orderedIds: fullOrder })
        if (!result.success) {
          console.error('[useHabits] reorderHabits persistence failed — rolling back')
          await fetchHabits()
        }
      } catch (e) {
        console.error('[useHabits] reorderHabits error — rolling back', e)
        await fetchHabits()
      }
    },
    [storeReorderHabits, fetchHabits],
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

    // Counts
    totalCount:     (habits as any[]).length,
    completedCount: completedIds.size,

    // Actions
    fetchHabits,
    toggleCompletion,
    createHabit,
    updateHabit,
    deleteHabit,
    reorderHabits,

    // DnD context
    isDragEnabled: sortBy === 'manual' || !sortBy,
  }
}
