/**
 * PRESENTATION LAYER — Router (Phase 2)
 *
 * StatsPage and SettingsPage are now real implementations.
 * Lazy-loaded for code splitting — the stats and settings bundles
 * are only fetched when the user navigates to those routes.
 */

import { lazy, Suspense }               from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout }                    from '@presentation/components/layout/AppLayout'
import { DashboardPage }                from '@presentation/pages/DashboardPage'
import { HabitsPage }                   from '@presentation/pages/HabitsPage'

// Lazy-load heavy pages — chart libs only load when needed
const StatsPage    = lazy(() => import('@presentation/pages/StatsPage').then((m) => ({ default: m.StatsPage })))
const SettingsPage = lazy(() => import('@presentation/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 pt-4">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ))}
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,      id: 'dashboard', element: <DashboardPage /> },
      { path: 'habits',   id: 'habits',    element: <HabitsPage /> },
      {
        path: 'stats',
        id: 'stats',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <StatsPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        id: 'settings',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
