/**
 * PRESENTATION LAYER — SortableCategoryGroup
 *
 * Renders a single category's habit list inside its own DndContext +
 * SortableContext so that drag-and-drop is scoped to within the category.
 *
 * Habits cannot be dragged from one category to another — this matches the
 * domain model (a habit belongs to exactly one category) and avoids the
 * complex collision detection needed for multi-container DnD.
 *
 * Usage:
 *   <SortableCategoryGroup
 *     category="health"
 *     habits={groupedHabits.get('health')}
 *     ...
 *   />
 *
 * Wiring:
 *   onReorder receives the ordered IDs within this category.
 *   The parent (HabitsPage) forwards this to useHabits.reorderHabits,
 *   which builds the full cross-category order before persisting.
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
import type { HabitCategory }                 from '@domain/entities/Habit'

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  health:        { label: 'Health',       emoji: '💪', color: '#22c55e' },
  fitness:       { label: 'Fitness',      emoji: '🏃', color: '#f59e0b' },
  mindfulness:   { label: 'Mindfulness',  emoji: '🧘', color: '#8b5cf6' },
  learning:      { label: 'Learning',     emoji: '📚', color: '#3b82f6' },
  creativity:    { label: 'Creativity',   emoji: '🎨', color: '#ec4899' },
  productivity:  { label: 'Productivity', emoji: '✅', color: '#06b6d4' },
  social:        { label: 'Social',       emoji: '🤝', color: '#f97316' },
  finance:       { label: 'Finance',      emoji: '💰', color: '#84cc16' },
  other:         { label: 'Other',        emoji: '📌', color: '#94a3b8' },
}

const DROP_ANIMATION = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.35' } },
  }),
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SortableCategoryGroupProps {
  category:      HabitCategory | string
  habits:        HabitSnapshot[]
  completedIds:  Set<string>
  activeTags:    string[]
  isDragEnabled: boolean
  onToggle:      (id: string) => void
  onDelete:      (id: string) => void
  onEdit:        (habit: HabitSnapshot) => void
  onTagClick:    (tag: string) => void
  onReorder:     (newIds: string[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SortableCategoryGroup({
  category,
  habits,
  completedIds,
  activeTags,
  isDragEnabled,
  onToggle,
  onDelete,
  onEdit,
  onTagClick,
  onReorder,
}: SortableCategoryGroupProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ids = useMemo(() => habits.map((h) => h.id), [habits])

  const activeHabit = useMemo(
    () => (activeId ? habits.find((h) => h.id === activeId) ?? null : null),
    [activeId, habits],
  )

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

      onReorder(arrayMove(ids, oldIndex, newIndex))
    },
    [ids, onReorder],
  )

  const meta = CATEGORY_META[category] ?? CATEGORY_META.other

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <section aria-label={`${meta.label} habits`}>
          {/* Category header */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-base leading-none">{meta.emoji}</span>
            <h3
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: meta.color }}
            >
              {meta.label}
            </h3>
            <span className="ml-auto text-xs text-slate-400 tabular-nums">
              {habits.length}
            </span>
          </div>

          {/* Habit cards */}
          <motion.div role="list" className="space-y-2 pl-0.5">
            <AnimatePresence initial={false}>
              {habits.map((habit) => (
                <motion.div
                  key={habit.id}
                  role="listitem"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.13, ease: 'easeOut' }}
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
        </section>
      </SortableContext>

      {/* Overlay clone */}
      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {activeHabit ? (
          <motion.div
            initial={{ scale: 1,    boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
            animate={{ scale: 1.03, boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="flex items-stretch gap-1.5"
            style={{ cursor: 'grabbing', willChange: 'transform' }}
          >
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
