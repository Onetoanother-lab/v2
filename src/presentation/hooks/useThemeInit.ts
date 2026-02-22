/**
 * PRESENTATION LAYER — useThemeInit hook
 *
 * Runs once on mount to apply the persisted theme class to <html>.
 * Import in App.tsx to guarantee the class is present before first paint.
 */

import { useEffect } from 'react'
import { useUIStore } from '@application/stores/uiStore'

export function useThemeInit() {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    document.documentElement.classList.toggle('dark', isDark)
  }, [theme])
}
