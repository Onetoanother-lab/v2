/**
 * PRESENTATION LAYER — DraggableHabitCard
 *
 * Wraps the existing <HabitCard> with @dnd-kit/sortable's useSortable hook
 * and framer-motion animation so the card:
 *
 *  • Scales up slightly and lifts shadow when being dragged
 *  • Animates smoothly into its new position after a drop (layout animation)
 *  • Shows a drag handle (⠿) on the left that only appears on hover
 *  • Works on both mouse and touch via dnd-kit's sensor system
 *
 * Performance notes:
 *  • This component is memoized — it only re-renders when the habit snapshot
 *    or completion state changes, not when sibling cards move.
 *  • transform is applied directly via CSS style (not Framer Motion state)
 *    during the drag to avoid triggering React reconciliation for every
 *    pointer-move event.  Framer Motion's `layout` prop handles the
 *    settle animation after the drop.
 *  • The drag overlay (rendered by SortableHabitList) shows a clone of the
 *    card with elevated shadow.  This component renders as a transparent
 *    placeholder while dragging.
 *
 * Architecture:
 *  • Zero business logic.  All DnD state flows up via the onReorder callback
 *    in SortableHabitList, which calls useHabits.reorderHabits.
 *  • HabitCard itself is unmodified — this is a pure wrapper.
 */

import { memo, useRef }                from 'react'
import { useSortable }                 from '@dnd-kit/sortable'
import { CSS }                         from '@dnd-kit/utilities'
import { motion }                      from 'framer-motion'
import { GripVertical }                from 'lucide-react'
import { HabitCard }                   from '@presentation/components/habits/HabitCard'
import type { HabitSnapshot }          from '@domain/entities/Habit'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DraggableHabitCardProps {
  habit:       HabitSnapshot
  isCompleted: boolean
  activeTags:  string[]
  isDragEnabled: boolean
  onToggle:    (id: string) => void
  onDelete:    (id: string) => void
  onEdit:      (habit: HabitSnapshot) => void
  onTagClick:  (tag: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DraggableHabitCard = memo(function DraggableHabitCard({
  habit,
  isCompleted,
  activeTags,
  isDragEnabled,
  onToggle,
  onDelete,
  onEdit,
  onTagClick,
}: DraggableHabitCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id:       habit.id,
    disabled: !isDragEnabled,
  })

  // Compose the CSS transform from dnd-kit (handles the in-flight position)
  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,   // no transition during drag = instant follow
    // Visually hide the placeholder while the overlay clone is rendered
    opacity:    isDragging ? 0.35 : 1,
    position:   'relative',
    zIndex:     isDragging ? 0 : 'auto',
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      // layout="position" animates the card into its new slot after a drop.
      // Using "position" (not true) avoids interfering with CSS transforms
      // applied by dnd-kit during the drag itself.
      layout="position"
      layoutId={`habit-card-${habit.id}`}
      transition={{
        layout: {
          type:      'spring',
          stiffness: 400,
          damping:   35,
          mass:      0.8,
        },
      }}
      className="flex items-stretch gap-1.5 group"
    >
      {/* ── Drag handle ─────────────────────────────────────────────────── */}
      {isDragEnabled && (
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder"
          aria-roledescription="sortable"
          className={[
            'flex items-center justify-center',
            'w-7 rounded-xl shrink-0',
            'text-slate-300 dark:text-slate-600',
            'cursor-grab active:cursor-grabbing',
            // Fade in on group hover; always visible while this card is dragging
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            isDragging ? 'opacity-100' : '',
            // Subtle hover highlight
            'hover:text-slate-500 dark:hover:text-slate-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          ].join(' ')}
          tabIndex={0}
        >
          <GripVertical size={15} aria-hidden />
        </button>
      )}

      {/* ── Habit card ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <HabitCard
          habit={habit}
          isCompleted={isCompleted}
          activeTags={activeTags}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          onTagClick={onTagClick}
        />
      </div>
    </motion.div>
  )
})
