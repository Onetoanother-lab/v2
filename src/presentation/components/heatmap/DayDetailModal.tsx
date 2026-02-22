/**
 * PRESENTATION LAYER — DayDetailModal
 *
 * Opens when the user clicks a day cell in the heatmap.
 * Shows:
 *  - Full date heading
 *  - Completion donut / stats bar
 *  - Completed habits list (green checkmarks)
 *  - Missed habits list (grey dashes)
 *
 * No business logic. Receives pre-computed DayDetail from useHeatmap.getDayDetail.
 * Animated via framer-motion (backdrop fade + modal spring).
 */

import { useEffect, useCallback }       from 'react'
import { motion, AnimatePresence }      from 'framer-motion'
import { X, CheckCircle2, Circle }      from 'lucide-react'
import type { DayDetail }               from '@presentation/hooks/useHeatmap'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    year:    'numeric',
  })
}

function pct(ratio: number) {
  return `${Math.round(ratio * 100)}%`
}

// ─── Color for the completion bar ─────────────────────────────────────────────

function ratioColor(ratio: number): string {
  if (ratio >= 0.75) return 'bg-emerald-500'
  if (ratio >= 0.50) return 'bg-emerald-400'
  if (ratio >= 0.25) return 'bg-amber-400'
  return 'bg-slate-300 dark:bg-slate-600'
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DayDetailModalProps {
  detail:   DayDetail | null
  onClose:  () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DayDetailModal({ detail, onClose }: DayDetailModalProps) {
  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (detail) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [detail, handleKeyDown])

  return (
    <AnimatePresence>
      {detail && (
        <>
          {/* ── Backdrop ──────────────────────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* ── Modal panel ───────────────────────────────────────────── */}
          <motion.div
            key="modal"
            role="dialog"
            aria-modal
            aria-label={`Habit breakdown for ${formatFullDate(detail.day.date)}`}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0,    scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={[
              'fixed z-50 inset-x-4 bottom-4 sm:inset-auto sm:left-1/2 sm:top-1/2',
              'sm:-translate-x-1/2 sm:-translate-y-1/2',
              'w-auto sm:w-full sm:max-w-md',
              'bg-white dark:bg-slate-900',
              'rounded-2xl shadow-2xl shadow-black/20',
              'border border-slate-100 dark:border-slate-800',
              'overflow-hidden',
            ].join(' ')}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mb-0.5">
                  Day summary
                </p>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {formatFullDate(detail.day.date)}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors -mr-1 -mt-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Completion bar */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {detail.day.completedCount} of {detail.day.dueCount} habits completed
                </span>
                <span className={[
                  'font-bold tabular-nums',
                  detail.day.ratio >= 0.75
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-300',
                ].join(' ')}>
                  {pct(detail.day.ratio)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${ratioColor(detail.day.ratio)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${detail.day.ratio * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                />
              </div>
            </div>

            {/* Habit lists */}
            <div className="px-5 py-4 max-h-72 overflow-y-auto space-y-3">

              {/* Completed */}
              {detail.completedHabits.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Completed
                  </p>
                  <ul className="space-y-2">
                    {detail.completedHabits.map((h, i) => (
                      <motion.li
                        key={h.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.03, duration: 0.2 }}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <CheckCircle2
                          size={15}
                          className="shrink-0 text-emerald-500 dark:text-emerald-400"
                          aria-hidden
                        />
                        <span className="text-slate-700 dark:text-slate-200">
                          {(h as any).icon && (
                            <span className="mr-1" aria-hidden>{(h as any).icon}</span>
                          )}
                          {h.name}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missed */}
              {detail.missedHabits.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Missed
                  </p>
                  <ul className="space-y-2">
                    {detail.missedHabits.map((h, i) => (
                      <motion.li
                        key={h.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.05 + (detail.completedHabits.length + i) * 0.03,
                          duration: 0.2,
                        }}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <Circle
                          size={15}
                          className="shrink-0 text-slate-300 dark:text-slate-600"
                          aria-hidden
                        />
                        <span className="text-slate-400 dark:text-slate-500">
                          {(h as any).icon && (
                            <span className="mr-1 opacity-50" aria-hidden>{(h as any).icon}</span>
                          )}
                          {h.name}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Empty state */}
              {detail.completedHabits.length === 0 && detail.missedHabits.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                  No habits were tracked on this day.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
