/**
 * PRESENTATION LAYER — Topbar with Dark Mode Toggle
 */

import { Sun, Moon } from 'lucide-react'
import { useUIStore }    from '@application/stores/uiStore'
import { Button }        from '@presentation/components/ui/Button'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const { theme, toggleTheme } = useUIStore()

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white/80 px-6 backdrop-blur-sm dark:bg-slate-900/80 dark:border-slate-800">
      <h1 className="font-display text-xl font-700 tracking-tight text-slate-900 dark:text-white">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  )
}
