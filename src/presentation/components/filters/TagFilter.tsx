/**
 * PRESENTATION LAYER — TagFilter
 *
 * Displays available tags as toggleable pills.
 * When multiple tags are selected, shows an AND/OR mode toggle.
 * Active tags render with a filled style; inactive are outlined.
 *
 * Purely presentational. No filter logic inside this component.
 * Logic lives in filterStore (Application layer).
 *
 * Render optimization:
 *   • React.memo on component + each TagPill
 *   • Only re-renders when availableTags, activeTags, or mode changes
 *   • Uses stable callback references passed as props
 */

import { memo }            from 'react'
import { X, Tag }          from 'lucide-react'
import { cn }              from '@presentation/styles/cn'
import type { TagFilterMode } from '@application/stores/filterStore'

interface TagFilterProps {
  availableTags: string[]
  activeTags:    string[]
  tagMode:       TagFilterMode
  onToggleTag:   (tag: string) => void
  onSetTagMode:  (mode: TagFilterMode) => void
  onClear:       () => void
  className?:    string
}

// ─── TagPill ──────────────────────────────────────────────────────────────────

interface TagPillProps {
  tag:       string
  isActive:  boolean
  onClick:   () => void
}

const TagPill = memo(function TagPill({ tag, isActive, onClick }: TagPillProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        'transition-all duration-150 whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        isActive
          ? 'bg-brand-500 text-white shadow-sm'
          : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600',
      )}
    >
      <Tag size={10} aria-hidden />
      {tag}
    </button>
  )
})

// ─── Component ────────────────────────────────────────────────────────────────

export const TagFilter = memo(function TagFilter({
  availableTags,
  activeTags,
  tagMode,
  onToggleTag,
  onSetTagMode,
  onClear,
  className,
}: TagFilterProps) {
  if (!availableTags.length) return null

  const hasActive = activeTags.length > 0

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Tags
        </p>

        <div className="flex items-center gap-2">
          {/* AND/OR toggle — only shown when ≥2 tags selected */}
          {activeTags.length >= 2 && (
            <div className="flex items-center rounded-full border border-slate-200 dark:border-slate-700 p-0.5 text-[11px] font-semibold">
              {(['any', 'all'] as TagFilterMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onSetTagMode(mode)}
                  aria-pressed={tagMode === mode}
                  className={cn(
                    'rounded-full px-2 py-0.5 transition-colors duration-100',
                    tagMode === mode
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
                  )}
                >
                  {mode === 'any' ? 'OR' : 'AND'}
                </button>
              ))}
            </div>
          )}

          {/* Clear button */}
          {hasActive && (
            <button
              onClick={onClear}
              aria-label="Clear tag filters"
              className="flex items-center gap-0.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={10} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Tag pills */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tag filters">
        {availableTags.map((tag) => (
          <TagPill
            key={tag}
            tag={tag}
            isActive={activeTags.includes(tag)}
            onClick={() => onToggleTag(tag)}
          />
        ))}
      </div>
    </div>
  )
})
