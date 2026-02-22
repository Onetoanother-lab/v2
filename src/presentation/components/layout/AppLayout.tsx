/**
 * PRESENTATION LAYER — App Layout
 *
 * Wraps every authenticated page with sidebar + topbar.
 */

import { Outlet, useMatches } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar }  from './Topbar'

/** Map route IDs to human-readable page titles */
const TITLE_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  habits:    'My Habits',
  stats:     'Statistics',
  settings:  'Settings',
}

export function AppLayout() {
  const matches = useMatches()
  const lastMatch = matches[matches.length - 1]
  const title = TITLE_MAP[lastMatch?.id ?? ''] ?? 'Habitual'

  return (
    <div className="flex h-screen overflow-hidden bg-surface-light dark:bg-surface-dark">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} />

        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
