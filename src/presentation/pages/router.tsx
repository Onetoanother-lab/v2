/**
 * PRESENTATION LAYER — Router
 *
 * Uses React Router v6 createBrowserRouter with loader-friendly
 * route IDs so AppLayout can derive page titles automatically.
 */

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout }      from '@presentation/components/layout/AppLayout'
import { DashboardPage }  from '@presentation/pages/DashboardPage'
import { HabitsPage }     from '@presentation/pages/HabitsPage'
import { StatsPage, SettingsPage } from '@presentation/pages/PlaceholderPages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,       id: 'dashboard', element: <DashboardPage /> },
      { path: 'habits',    id: 'habits',    element: <HabitsPage /> },
      { path: 'stats',     id: 'stats',     element: <StatsPage /> },
      { path: 'settings',  id: 'settings',  element: <SettingsPage /> },
      { path: '*',                           element: <Navigate to="/" replace /> },
    ],
  },
])
