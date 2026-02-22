/**
 * PRESENTATION LAYER — SortableHabitList
 *
 * Provides the DnD context for a flat list of habits (the "all" view).
 * For the grouped (category) view, use <SortableCategoryGroup>.
 *
 * Responsibilities:
 *  • Configure sensors (pointer + keyboard; touch handled by pointer sensor)
 *  • Manage activeId state to render the floating overlay clone
 *  • Call arrayMove() on DragEnd, then fire onReorder(newIds)
 *  • Render each item as a <DraggableHabitCard>
 *
 * What this component does NOT do:
 *  • No business logic (no use case calls)
 *  • No persistence (that's in useHabits.reorderHabits via onReorder)
 *  • No knowledge of streaks, categories, gamification
 *
 * Performance:
 *  • The DragOverlay renders a Portal outside the list DOM so siblings
 *    don't re-render when the overlay moves.
 *  • arrayMove is called only on DragEnd, not on every DragOver.
 *  • Each DraggableHabitCard is memoized.
 */

import { useState, useCallback, useMemo }     from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
}                                             from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent }  from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
}                                             from '@dnd-kit/sortable'
import { motion, AnimatePresence }            from 'framer-motion'
import { DraggableHabitCard }                 from './DraggableHabitCard'
import { HabitCard }                          from '@presentation/components/habits/HabitCard'
import type { HabitSnapshot }                 from '@domain/entities/Habit'

// ─── Props ────────────────────────────────────────────────────────────────────

interface SortableHabitListProps {
  habits:        HabitSnapshot[]
  completedIds:  Set<string>
  activeTags:    string[]
  isDragEnabled: boolean
  onToggle:      (id: string) => void
  onDelete:      (id: string) => void
  onEdit:        (habit: HabitSnapshot) => void
  onTagClick:    (tag: string) => void
  /** Called with the new ordered array of IDs after a drop */
  onReorder:     (newIds: string[]) => void
}

// ─── Drop animation ───────────────────────────────────────────────────────────

const DROP_ANIMATION = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0.35' },
    },
  }),
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SortableHabitList({
  habits,
  completedIds,
  activeTags,
  isDragEnabled,
  onToggle,
  onDelete,
  onEdit,
  onTagClick,
  onReorder,
}: SortableHabitListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  // ── Sensors ─────────────────────────────────────────────────────────────────
  // PointerSensor handles mouse AND touch.
  // activationConstraint: a 8px movement threshold prevents accidental drags
  // when the user taps a button inside the card (toggle, edit, delete).
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,   // px — must move 8px before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // ── Sorted ID list for SortableContext ────────────────────────────────────
  const ids = useMemo(() => habits.map((h) => h.id), [habits])

  // ── The habit currently being dragged (for the overlay clone) ────────────
  const activeHabit = useMemo(
    () => (activeId ? habits.find((h) => h.id === activeId) ?? null : null),
    [activeId, habits],
  )

  // ── DnD event handlers ────────────────────────────────────────────────────

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveId(null)
      if (!over || active.id === over.id) return

      const oldIndex = ids.indexOf(active.id as string)
      const newIndex = ids.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return

      const newIds = arrayMove(ids, oldIndex, newIndex)
      onReorder(newIds)
    },
    [ids, onReorder],
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <motion.div
          role="list"
          aria-label="Habits"
          className="space-y-2"
        >
          <AnimatePresence initial={false}>
            {habits.map((habit) => (
              <motion.div
                key={habit.id}
                role="listitem"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <DraggableHabitCard
                  habit={habit}
                  isCompleted={completedIds.has(habit.id)}
                  activeTags={activeTags}
                  isDragEnabled={isDragEnabled}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onTagClick={onTagClick}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </SortableContext>

      {/* ── Floating drag overlay ────────────────────────────────────────── */}
      {/* Rendered in a Portal — zero impact on list layout or re-renders     */}
      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {activeHabit ? (
          <motion.div
            initial={{ scale: 1,    boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
            animate={{ scale: 1.03, boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="flex items-stretch gap-1.5"
            style={{ cursor: 'grabbing', willChange: 'transform' }}
          >
            {/* Mimic the drag handle width so the overlay aligns with the card */}
            {isDragEnabled && <div className="w-7 shrink-0" />}
            <div className="flex-1 min-w-0">
              <HabitCard
                habit={activeHabit}
                isCompleted={completedIds.has(activeHabit.id)}
                activeTags={activeTags}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
                onTagClick={onTagClick}
              />
            </div>
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
