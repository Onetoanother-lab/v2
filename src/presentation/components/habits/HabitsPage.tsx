/**
 * PRESENTATION LAYER — HabitsPage (v4 — Heatmap View)
 *
 * Changes from v3:
 *  • ViewToggle added to header (list ↔ heatmap)
 *  • AnimatePresence wraps both views for smooth crossfade
 *  • HeatmapCalendar + DayDetailModal rendered in heatmap mode
 *  • useHeatmap hook provides memoized data (no calculation in this component)
 *
 * Constraints maintained:
 *  • No streak logic modified
 *  • No business logic in this file
 *  • Architecture boundaries intact (hook → selector → domain)
 *  • DnD from v3 fully preserved in list view
 */

import { useState, useCallback, useMemo }    from 'react'
import { Plus, GripVertical }                from 'lucide-react'
import { AnimatePresence, motion }           from 'framer-motion'

import { useHabits }                         from '@presentation/hooks/useHabits'
import { useHeatmap }                        from '@presentation/hooks/useHeatmap'
import { useFilterStore }                    from '@application/stores/filterStore'
import { usePWA }                            from '@presentation/hooks/usePWA'

import { FilterBar }                         from '@presentation/components/filters/FilterBar'
import { SortableHabitList }                 from '@presentation/components/habits/SortableHabitList'
import { SortableCategoryGroup }             from '@presentation/components/habits/SortableCategoryGroup'
import { HeatmapCalendar }                   from '@presentation/components/heatmap/HeatmapCalendar'
import { DayDetailModal }                    from '@presentation/components/heatmap/DayDetailModal'
import { ViewToggle }                        from '@presentation/components/ui/ViewToggle'
import type { ViewMode }                     from '@presentation/components/ui/ViewToggle'
import { CreateHabitModal, EditHabitModal }  from '@presentation/components/habits/HabitModals'
import { DeleteConfirmModal }                from '@presentation/components/habits/DeleteConfirmModal'
import { EmptyState }                        from '@presentation/components/ui/EmptyState'
import { PWAInstallBanner }                  from '@presentation/components/pwa/PWABanners'
import { useHabitStore }                     from '@application/stores/habitStore'
import type { HabitSnapshot }                from '@domain/entities/Habit'
import type { DayDetail }                    from '@presentation/hooks/useHeatmap'

export function HabitsPage() {
  // ── Data & actions ─────────────────────────────────────────────────────
  const {
    habits,
    groupedHabits,
    completedIds,
    selectedDate,
    isLoading,
    error,
    totalCount,
    toggleCompletion,
    createHabit,
    updateHabit,
    deleteHabit,
    reorderHabits,
    isDragEnabled,
  } = useHabits()

  const { heatmapData, getDayDetail, hasData } = useHeatmap()

  const allHabits = useHabitStore((s) => s.habits)

  // ── Filter store ───────────────────────────────────────────────────────
  const groupBy    = useFilterStore((s) => s.groupBy)
  const activeTags = useFilterStore((s) => s.activeTags)
  const toggleTag  = useFilterStore((s) => s.toggleTag)
  const sortBy     = useFilterStore((s) => s.sortBy)
  const setSortBy  = useFilterStore((s) => s.setSortBy)

  // ── Local UI state ─────────────────────────────────────────────────────
  const [viewMode,      setViewMode]      = useState<ViewMode>('list')
  const [createOpen,    setCreateOpen]    = useState(false)
  const [editingHabit,  setEditingHabit]  = useState<HabitSnapshot | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [dayDetail,     setDayDetail]     = useState<DayDetail | null>(null)

  // ── PWA ────────────────────────────────────────────────────────────────
  const { isInstallable, isOnline, install } = usePWA()

  // ── Stable callbacks ───────────────────────────────────────────────────
  const handleToggle   = useCallback((id: string) => toggleCompletion(id), [toggleCompletion])
  const handleEdit     = useCallback((h: HabitSnapshot) => setEditingHabit(h), [])
  const handleDelete   = useCallback((id: string) => setPendingDelete(id), [])
  const handleTagClick = useCallback((tag: string) => toggleTag(tag), [toggleTag])

  const handleConfirmDelete = useCallback(async () => {
    if (pendingDelete) {
      await deleteHabit(pendingDelete)
      setPendingDelete(null)
    }
  }, [pendingDelete, deleteHabit])

  const handleReorder = useCallback(
    (newIds: string[]) => reorderHabits(newIds),
    [reorderHabits],
  )

  const handleCategoryReorder = useCallback(
    (category: string, newCategoryIds: string[]) => {
      const allIds      = (allHabits as any[]).map((h) => h.id)
      const categorySet = new Set(newCategoryIds)
      const outsideIds  = allIds.filter((id: string) => !categorySet.has(id))
      const firstIdx    = allIds.findIndex((id: string) => categorySet.has(id))
      const merged = [
        ...outsideIds.slice(0, firstIdx < 0 ? outsideIds.length : firstIdx),
        ...newCategoryIds,
        ...outsideIds.slice(firstIdx < 0 ? outsideIds.length : firstIdx),
      ]
      reorderHabits(merged)
    },
    [allHabits, reorderHabits],
  )

  const handleDayClick = useCallback(
    (dateStr: string) => {
      const detail = getDayDetail(dateStr)
      if (detail) setDayDetail(detail)
    },
    [getDayDetail],
  )

  // ── Date / progress ────────────────────────────────────────────────────
  const completedCount = completedIds.size
  const dueCount       = (habits as any[]).filter((h) => h.isDueToday).length
  const progressPct    = dueCount > 0 ? completedCount / dueCount : 0

  const dateLabel = useMemo(() => {
    const isToday = selectedDate === new Date().toISOString().split('T')[0]
    if (isToday) return 'Today'
    const d = new Date(selectedDate + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }, [selectedDate])

  return (
    <div className="mx-auto max-w-2xl space-y-5">

      {/* ── Install banner ─────────────────────────────────────────────── */}
      {isInstallable && (
        <PWAInstallBanner isInstallable isOnline={isOnline} onInstall={install} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white truncate">
            {viewMode === 'list' ? dateLabel : 'Year in Review'}
          </h2>
          {viewMode === 'list' && dueCount > 0 && (
            <p className="text-sm text-slate-400 mt-0.5">
              {completedCount} of {dueCount} habits done
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasData && (
            <ViewToggle value={viewMode} onChange={setViewMode} />
          )}
          {viewMode === 'list' && (
            <button
              onClick={() => setCreateOpen(true)}
              aria-label="Create new habit"
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
            >
              <Plus size={15} aria-hidden />
              New habit
            </button>
          )}
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────── */}
      {viewMode === 'list' && dueCount > 0 && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={Math.round(progressPct * 100)}
          aria-valuemax={100}
          aria-label="Today's progress"
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPct * 100}%`,
              backgroundColor:
                progressPct === 1 ? '#22c55e' : progressPct >= 0.5 ? '#84cc16' : '#94a3b8',
            }}
          />
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Filter bar + sort toggle (list view only) ───────────────────── */}
      {viewMode === 'list' && (allHabits.length > 0 || totalCount > 0) && (
        <div className="space-y-2">
          <FilterBar habits={allHabits as any} />
          {totalCount > 1 && (
            <div className="flex items-center justify-end gap-2 px-1">
              <button
                onClick={() => setSortBy(isDragEnabled ? 'created' : 'manual')}
                aria-pressed={isDragEnabled}
                className={[
                  'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                  isDragEnabled
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
                ].join(' ')}
              >
                <GripVertical size={13} aria-hidden />
                {isDragEnabled ? 'Drag to reorder' : 'Enable manual order'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main content — animated view switch ─────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>

        {viewMode === 'heatmap' && (
          <motion.div
            key="heatmap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            {hasData ? (
              <HeatmapCalendar
                data={heatmapData}
                onDayClick={handleDayClick}
              />
            ) : (
              <EmptyState
                icon="📅"
                title="No history yet"
                description="Complete some habits to see your year in review."
              />
            )}
          </motion.div>
        )}

        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            {isLoading ? (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>

            ) : habits.length === 0 ? (
              <EmptyState
                icon="🌱"
                title={totalCount === 0 ? 'No habits yet' : 'No habits match your filters'}
                description={
                  totalCount === 0
                    ? 'Create your first habit to start building your streak.'
                    : 'Try adjusting your category or tag filters.'
                }
                action={
                  totalCount === 0 ? (
                    <button
                      onClick={() => setCreateOpen(true)}
                      className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
                    >
                      <Plus size={14} aria-hidden />
                      Create a habit
                    </button>
                  ) : undefined
                }
              />

            ) : groupBy === 'category' ? (
              <div className="space-y-6" aria-label="Habits grouped by category">
                {[...groupedHabits.entries()].map(([category]) => {
                  if (category === 'all') return null
                  const categoryHabits = groupedHabits.get(category)!
                  return (
                    <SortableCategoryGroup
                      key={category}
                      category={category}
                      habits={categoryHabits}
                      completedIds={completedIds}
                      activeTags={activeTags}
                      isDragEnabled={isDragEnabled}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onTagClick={handleTagClick}
                      onReorder={(ids) => handleCategoryReorder(category as string, ids)}
                    />
                  )
                })}
              </div>

            ) : (
              <SortableHabitList
                habits={habits}
                completedIds={completedIds}
                activeTags={activeTags}
                isDragEnabled={isDragEnabled}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onTagClick={handleTagClick}
                onReorder={handleReorder}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <CreateHabitModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={createHabit}
      />

      <EditHabitModal
        habit={editingHabit}
        isOpen={editingHabit !== null}
        onClose={() => setEditingHabit(null)}
        onSubmit={updateHabit}
      />

      <DeleteConfirmModal
        isOpen={pendingDelete !== null}
        habitName={(allHabits as any[]).find((h) => h.id === pendingDelete)?.name ?? ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <DayDetailModal
        detail={dayDetail}
        onClose={() => setDayDetail(null)}
      />
    </div>
  )
}
