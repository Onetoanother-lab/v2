/**
 * PRESENTATION LAYER — Sidebar Navigation
 */

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react'
import { cn } from '@presentation/styles/cn'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { to: '/',        label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/habits',  label: 'Habits',    icon: <CheckSquare size={18} /> },
  { to: '/stats',   label: 'Stats',     icon: <BarChart3 size={18} /> },
  { to: '/settings',label: 'Settings',  icon: <Settings size={18} /> },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-white dark:bg-slate-900 dark:border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500">
          <Sparkles size={16} className="text-white" />
        </div>
        <span className="font-display text-lg font-700 tracking-tight text-slate-900 dark:text-white">
          Habitual
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer hint */}
      <div className="px-5 py-4 text-xs text-slate-400 dark:text-slate-600">
        v0.1.0 — scaffold
      </div>
    </aside>
  )
}
