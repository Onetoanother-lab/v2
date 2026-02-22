/**
 * App.tsx — Root Component
 *
 * Responsibilities:
 *  1. Initialize theme from persisted store
 *  2. Render the RouterProvider
 */

import { RouterProvider } from 'react-router-dom'
import { router }         from '@presentation/pages/router'
import { useThemeInit }   from '@presentation/hooks/useThemeInit'

export function App() {
  // Apply theme class to <html> before first render
  useThemeInit()

  return <RouterProvider router={router} />
}
