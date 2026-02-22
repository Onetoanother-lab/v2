/**
 * APPLICATION LAYER — UI Store
 *
 * Manages cross-cutting UI state: theme, sidebar, notifications.
 * Persisted to localStorage via Zustand's persist middleware.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '@domain/types/shared'

interface UIState {
  theme: Theme
  isSidebarOpen: boolean
  // ─── Actions ─────────────────────────────────────────────
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

/** Resolve 'system' preference against OS setting */
const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

/** Apply theme class to <html> element */
const applyThemeToDom = (theme: Theme) => {
  const resolved = resolveTheme(theme)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      isSidebarOpen: true,

      setTheme: (theme) => {
        applyThemeToDom(theme)
        set({ theme })
      },

      toggleTheme: () => {
        const current = resolveTheme(get().theme)
        const next: Theme = current === 'dark' ? 'light' : 'dark'
        applyThemeToDom(next)
        set({ theme: next })
      },

      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      toggleSidebar: () =>
        set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
    }),
    {
      name: 'habit-tracker-ui',
      // Only persist theme; sidebar resets each session
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToDom(state.theme)
      },
    },
  ),
)
