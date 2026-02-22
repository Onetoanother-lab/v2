/**
 * APPLICATION LAYER — Filter Store
 *
 * Manages the active category + tag filters for the HabitsPage.
 *
 * ─── Architecture note ────────────────────────────────────────────────────────
 * Filter state is UI concern, NOT domain concern.
 * It lives in the Application layer (not Domain) because it coordinates
 * between UI selections and repository query parameters.
 *
 * ─── Persistence ──────────────────────────────────────────────────────────────
 * Persisted to sessionStorage (not localStorage) so filters reset on
 * browser close but survive page refreshes / navigation within the session.
 *
 * ─── Separation from habit store ──────────────────────────────────────────────
 * Filters are NOT stored inside habitStore to avoid coupling:
 *   • habitStore is about data (habits, entries)
 *   • filterStore is about view configuration
 * This prevents unrelated filter changes from triggering habit re-renders.
 *
 * ─── Data flow ────────────────────────────────────────────────────────────────
 * FilterStore → useHabits hook → repository query options → filtered habits list
 *
 * The ACTUAL filtering is done by the repository (IDB index for category,
 * JS-side for tags). The filter store just holds the current selection.
 * This keeps filtering logic OUT of presentation components.
 */

import { create }                       from 'zustand'
import { persist, createJSONStorage }   from 'zustand/middleware'
import type { HabitCategory }           from '@domain/entities/Habit'

// ─── State shape ──────────────────────────────────────────────────────────────

export type GroupByMode = 'none' | 'category'
export type SortMode    = 'created' | 'name' | 'streak' | 'completion'
export type TagFilterMode = 'any' | 'all'

interface FilterState {
  // Active filters
  activeCategory:  HabitCategory | null    // null = all categories
  activeTags:      string[]               // empty = no tag filter
  tagMode:         TagFilterMode          // 'any' (OR) or 'all' (AND)

  // View options
  groupBy:   GroupByMode
  sortBy:    SortMode
  showCompleted: boolean   // show already-completed habits in the list

  // Available options (populated from the repo after load)
  availableCategories: HabitCategory[]
  availableTags:       string[]

  // ── Actions ────────────────────────────────────────────────────────────
  setCategory:          (cat: HabitCategory | null) => void
  toggleTag:            (tag: string) => void
  setTagMode:           (mode: TagFilterMode) => void
  clearFilters:         () => void
  setGroupBy:           (mode: GroupByMode) => void
  setSortBy:            (mode: SortMode) => void
  setShowCompleted:     (show: boolean) => void
  setAvailableOptions:  (cats: HabitCategory[], tags: string[]) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      activeCategory:      null,
      activeTags:          [],
      tagMode:             'any',
      groupBy:             'none',
      sortBy:              'created',
      showCompleted:       true,
      availableCategories: [],
      availableTags:       [],

      setCategory: (cat) => set({ activeCategory: cat }),

      toggleTag: (tag) =>
        set((s) => ({
          activeTags: s.activeTags.includes(tag)
            ? s.activeTags.filter((t) => t !== tag)
            : [...s.activeTags, tag],
        })),

      setTagMode: (mode) => set({ tagMode: mode }),

      clearFilters: () =>
        set({ activeCategory: null, activeTags: [], tagMode: 'any' }),

      setGroupBy:       (groupBy)       => set({ groupBy }),
      setSortBy:        (sortBy)        => set({ sortBy }),
      setShowCompleted: (showCompleted) => set({ showCompleted }),

      setAvailableOptions: (cats, tags) =>
        set({ availableCategories: cats, availableTags: tags }),
    }),
    {
      name:    'habitual-filters-v1',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist view preferences, not available options (those come from DB)
      partialize: (s) => ({
        activeCategory: s.activeCategory,
        activeTags:     s.activeTags,
        tagMode:        s.tagMode,
        groupBy:        s.groupBy,
        sortBy:         s.sortBy,
        showCompleted:  s.showCompleted,
      }),
    },
  ),
)

// ─── Derived selectors ─────────────────────────────────────────────────────────

export const useHasActiveFilters = () =>
  useFilterStore(
    (s) => s.activeCategory !== null || s.activeTags.length > 0,
  )

export const useActiveFilterCount = () =>
  useFilterStore(
    (s) => (s.activeCategory !== null ? 1 : 0) + s.activeTags.length,
  )
