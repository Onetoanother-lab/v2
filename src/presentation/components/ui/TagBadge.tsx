/**
 * PRESENTATION LAYER — TagBadge & TagList
 *
 * TagBadge:    Single tag pill with optional click-to-filter behavior.
 * TagList:     Renders up to N tags, collapses the rest with a "+N" indicator.
 *
 * Color palette: tags cycle through a set of muted hues so they're
 * visually distinct without being loud. The color is deterministic —
 * same tag always gets same color (based on string hash).
 *
 * Purely presentational. No filter logic inside.
 */

import { memo } from 'react'
import { cn }   from '@presentation/styles/cn'

// ─── Deterministic color palette ──────────────────────────────────────────────

const TAG_COLORS = [
  { bg: 'bg-sky-100 dark:bg-sky-900/30',       text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30',     text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30',     text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30',     text: 'text-pink-700 dark:text-pink-300' },
] as const

function hashTag(tag: string): number {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0
  return h % TAG_COLORS.length
}

export function getTagColor(tag: string) {
  return TAG_COLORS[hashTag(tag)]
}

// ─── TagBadge ─────────────────────────────────────────────────────────────────

interface TagBadgeProps {
  tag:        string
  onClick?:   (tag: string) => void
  isActive?:  boolean
  className?: string
}

export const TagBadge = memo(function TagBadge({
  tag,
  onClick,
  isActive,
  className,
}: TagBadgeProps) {
  const color = getTagColor(tag)

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(tag) : undefined}
      onClick={onClick ? () => onClick(tag) : undefined}
      aria-pressed={isActive}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none',
        color.bg, color.text,
        isActive && 'ring-1 ring-current ring-offset-1',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className,
      )}
    >
      #{tag}
    </span>
  )
})

// ─── TagList ──────────────────────────────────────────────────────────────────

interface TagListProps {
  tags:       string[]
  maxVisible?: number
  onTagClick?: (tag: string) => void
  activeTags?: string[]
  className?:  string
}

export const TagList = memo(function TagList({
  tags,
  maxVisible = 3,
  onTagClick,
  activeTags = [],
  className,
}: TagListProps) {
  if (!tags || tags.length === 0) return null

  const visible  = tags.slice(0, maxVisible)
  const overflow = tags.length - maxVisible

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visible.map((tag) => (
        <TagBadge
          key={tag}
          tag={tag}
          onClick={onTagClick}
          isActive={activeTags.includes(tag)}
        />
      ))}

      {overflow > 0 && (
        <span className="text-[11px] font-medium text-slate-400">
          +{overflow}
        </span>
      )}
    </div>
  )
})
