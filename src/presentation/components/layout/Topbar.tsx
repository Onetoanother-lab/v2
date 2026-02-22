/**
 * PRESENTATION LAYER — Topbar (Phase 2)
 *
 * Added: PointsChip (XP display), install button when installable.
 */

import { Sun, Moon, Download } from 'lucide-react'
import { useUIStore }          from '@application/stores/uiStore'
import { Button }              from '@presentation/components/ui/Button'
import { PointsChip }          from '@presentation/components/gamification/LevelCard'
import { useGamificationStore } from '@application/stores/gamificationStore'
import { usePWA }              from '@presentation/hooks/usePWA'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const { theme, toggleTheme } = useUIStore()
  const { isInstallable, install } = usePWA()

  const totalPoints  = useGamificationStore((s) => s.totalPoints)
  const levelEmoji   = useGamificationStore((s) => s.levelEmoji)
  const levelName    = useGamificationStore((s) => s.levelName)

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white/80 px-6 backdrop-blur-sm dark:bg-slate-900/80 dark:border-slate-800">
      <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {/* XP chip — only show when user has points */}
        {totalPoints > 0 && (
          <PointsChip
            points={totalPoints}
            levelEmoji={levelEmoji}
            levelName={levelName}
          />
        )}

        {/* Install button (only when installable and not installed) */}
        {isInstallable && (
          <Button variant="ghost" size="sm" onClick={install} aria-label="Install app">
            <Download size={15} />
          </Button>
        )}

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
