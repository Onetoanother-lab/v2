/**
 * PRESENTATION LAYER — EmptyState
 *
 * Displayed when a list has no items. Purely presentational.
 */

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center gap-4 py-20 text-center">
      <span className="text-5xl" role="img" aria-hidden>
        {icon}
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        <p className="text-sm text-slate-400 max-w-xs">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
