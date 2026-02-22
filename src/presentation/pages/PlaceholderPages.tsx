/** Placeholder pages — implemented in Phase 2 */

export function StatsPage() {
  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
      <span className="text-5xl">📈</span>
      <h2 className="font-display text-2xl font-700 text-slate-900 dark:text-white">
        Statistics
      </h2>
      <p className="text-slate-400">Charts and streaks — coming in Phase 2.</p>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
      <span className="text-5xl">⚙️</span>
      <h2 className="font-display text-2xl font-700 text-slate-900 dark:text-white">
        Settings
      </h2>
      <p className="text-slate-400">Preferences and account — coming in Phase 2.</p>
    </div>
  )
}
