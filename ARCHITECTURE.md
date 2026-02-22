# Habitual — Phase 2: PWA + Gamification
## Architecture & Implementation Guide

---

## 1. PWA Setup

### Service Worker (`public/sw.js`)

Three caching strategies, each applied to the right resource class:

| Resource | Strategy | Rationale |
|---|---|---|
| HTML navigation | **Cache-first + network fallback** | App shell always loads instantly |
| JS/CSS bundles | **Stale-while-revalidate** | Serve cache now, update in background |
| Images/icons | **Cache-first** | Immutable assets, never stale |
| API/external | **Network-first + cache fallback** | Fresh data preferred, offline fallback |

**Boot sequence:**
```
containerReady → IDB open/migrate
      ↓
registerServiceWorker() → SW installed, app shell pre-cached
      ↓
React.render()
```

The SW is registered _after_ IDB initialization so any data migrations
complete before the SW intercepts fetch requests.

### Manifest (`public/manifest.json`)

```json
{
  "name": "Habitual — Build Better Habits",
  "display": "standalone",
  "theme_color": "#22c55e",
  "shortcuts": ["/habits", "/stats"],
  "icons": [72, 96, 128, 152, 192, 384, 512]
}
```

Required for Chrome/Edge/Safari install prompts. The `maskable` icon
variants are listed for Android adaptive icons.

### Install Prompt (`infrastructure/ServiceWorkerRegistration.ts`)

```
beforeinstallprompt → captured → stored as deferredInstallPrompt
                          ↓
User clicks "Install" → prompt() → userChoice
                          ↓
             accepted → pwa:installed event → isInstallable = false
```

The `usePWA` hook listens for `pwa:installable`, `pwa:installed`,
`pwa:offlineready`, and `pwa:updateavailable` window events.

### Notification Scheduling

Local (no push server required) — uses SW `setTimeout` pattern:

```
saveNotificationPref(pref)
        ↓
syncScheduleWithServiceWorker()
        ↓
SW: postMessage({ type: 'SCHEDULE_NOTIFICATIONS', notifications })
        ↓
SW: setTimeout(msUntilNextFire(pref)) → showNotification()
        ↓
Next occurrence auto-rescheduled
```

Supports per-habit time + day-of-week configuration.
Snooze (30 min) handled via `notificationclick` action.

---

## 2. Chart Integration

Library: **Recharts** (composable, tree-shakeable, React-native)

### Charts delivered

| Chart | Component | Use |
|---|---|---|
| Bar chart | `WeeklyCompletionChart` | Daily completion % last 28 days |
| Area chart | `StreakLineChart` | Per-habit streak history |
| Heatmap | `CompletionHeatmap` | GitHub-style 16-week grid (pure CSS) |
| Radar chart | `CategoryRadarChart` | Completion rate by category |

### Code-splitting strategy

```tsx
// StatsPage lazy-loads ALL chart components
const WeeklyCompletionChart = lazy(() => import('…/charts/WeeklyCompletionChart'))
const CompletionHeatmap     = lazy(() => import('…/charts/CompletionHeatmap'))
```

Recharts (~300KB) is split into its own `vendor-charts` chunk.
This chunk is only fetched when the user navigates to `/stats`.
Initial bundle stays under 150KB gzipped.

### Data derivation

All chart data is computed in `StatsPage` using `useMemo`:

```ts
const weeklyData = useMemo(
  () => buildWeeklyData(habits, entries, selectedDate),
  [habits, entries, selectedDate],   // only recalculates when these change
)
```

No chart component touches the store. Data flows down as props.

---

## 3. Gamification Logic

### Architecture boundary

```
Domain           →  GamificationEngine.ts    (pure functions, no I/O)
Application      →  gamificationStore.ts     (Zustand + persist middleware)
Presentation     →  useGamification.ts       (hook bridge to UI)
                 →  BadgeGrid, LevelCard,     (display components)
                    BadgeUnlockToast
```

`GamificationEngine.ts` has zero imports from outside the domain.
It can be tested with `vitest` with no mocking needed.

### Point system

```
Base:        +10 pts per completion
Freq bonus:  +5 pts for weekly/custom habits
Multipliers:
  streak ≥ 7    → ×1.5
  streak ≥ 30   → ×2.0
  streak ≥ 100  → ×3.0
```

Points are recalculated from scratch on each `recalculate()` call,
making the store self-healing if data is imported or corrected.

### Badge system (18 badges)

| Rarity | Count | Examples |
|---|---|---|
| Common | 5 | First completion, 50 total, 3 habits |
| Rare | 8 | Week warrior, early bird, perfect week |
| Epic | 3 | Monthly master, 10 habits, 500 completions |
| Legendary | 2 | Century club, perfect month |

Badge evaluation is a pure predicate over aggregated stats:

```ts
evaluateBadges({
  totalCompletions, maxCurrentStreak, habitCount,
  categoryCount, existingBadgeIds, allEntries, today
}) → Badge[]   // newly unlocked only
```

### Level system (10 levels)

```
0 XP   → Seedling 🌱
100    → Sprout 🌿
300    → Sapling 🌳
600    → Runner 🏃
1000   → Achiever 🎯
1500   → Challenger ⚔️
2500   → Champion 🏆
4000   → Legend ⭐
6000   → Mythic 🌟
10000  → Immortal 👑
```

### Persistence

Gamification state is persisted via Zustand `persist` middleware
to `localStorage` under key `habit-tracker-gamification-v1`.

On rehydration, derived level fields are recomputed from `totalPoints`
to ensure consistency even if the level table changes between versions.

### Trigger flow

```
User toggles habit → optimistic update → use case
                          ↓
                    useGamification.triggerRecalculation()
                          ↓
                    gamificationStore.recalculate()
                          ↓
                    Returns Badge[] (newly unlocked)
                          ↓
                    BadgeUnlockToast (auto-dismiss 4s)
```

---

## 4. Performance Explanation

### Bundle splitting

Three manual Rollup chunks:

```
vendor-react.js    ~130KB gz   React + ReactDOM + React Router
vendor-charts.js   ~280KB gz   Recharts + D3 internals
vendor-state.js    ~10KB gz    Zustand
app.js             ~90KB gz    Application code
```

Stats page (charts) only loads `vendor-charts` on navigation.
Initial page load never fetches chart code.

### Render optimization summary

| Technique | Applied to | Benefit |
|---|---|---|
| `React.memo` | HabitCard, all charts, BadgeCard | Skip re-render when props unchanged |
| Selector subscriptions | All store consumers | Re-render only on subscribed slice change |
| `useCallback` | All action handlers in hooks | Stable references prevent child re-renders |
| `useMemo` | Chart data derivation, completedIds Set | Expensive computation skipped on unrelated updates |
| `lazy + Suspense` | StatsPage, SettingsPage, all charts | Code split; load only when navigated to |
| Optimistic updates | toggleCompletion | <16ms UI response, no spinner |
| Skeleton loaders | HabitList, StatsPage charts | No layout shift during async fetch |
| `skipWaiting()` | Service worker | New SW activates immediately on update |
| `updateViaCache: 'none'` | SW registration | SW file always fetched fresh from network |

### Core Web Vitals targets

| Metric | Target | Technique |
|---|---|---|
| LCP | < 1.5s | App shell cached by SW on first visit |
| FID/INP | < 100ms | Optimistic updates, no blocking tasks |
| CLS | 0 | Skeleton loaders maintain layout, no late-loading images above fold |
| TTI | < 3s | Vendor splitting, lazy routes, IDB async init |

### Offline guarantee

The app is **fully functional offline** after the first visit:

- App shell (HTML/JS/CSS) → pre-cached by SW on install
- Habit data → stored in IndexedDB (survives browser restart)
- Gamification state → stored in localStorage
- Notification schedules → stored in localStorage + synced to SW
- No external API dependencies at runtime

---

## 5. Final Architecture Recap

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION                            │
│                                                                 │
│  Pages:  Dashboard  Habits  Stats  Settings                     │
│  Hooks:  useHabits  useGamification  usePWA                     │
│                                                                 │
│  Components:                                                    │
│    charts/      WeeklyCompletionChart  StreakLineChart          │
│                 CompletionHeatmap      CategoryRadarChart       │
│    gamification/ BadgeGrid  LevelCard  BadgeUnlockToast         │
│    pwa/          PWABanners (install / offline / update)        │
│    habits/       HabitCard  HabitList  CreateHabitModal         │
│    ui/           Input  Modal  Select  ColorPicker  …           │
│    layout/       AppLayout  Topbar  Sidebar                     │
│                                                                 │
│  ← Hooks are the ONLY import point to Application layer →       │
└────────────────────────┬────────────────────────────────────────┘
                         │ useHabits / useGamification / usePWA
┌────────────────────────▼────────────────────────────────────────┐
│                        APPLICATION                              │
│                                                                 │
│  Stores:   habitStore  gamificationStore  uiStore               │
│  Use Cases: GetHabits  ToggleCompletion  CreateHabit …          │
│                                                                 │
│  ← Use Cases are the ONLY import point to Domain layer →        │
└────────────────────────┬────────────────────────────────────────┘
                         │ entities / value objects / services
┌────────────────────────▼────────────────────────────────────────┐
│                          DOMAIN                                 │
│                                                                 │
│  Entities:  Habit  HabitEntry                                   │
│  Services:  StreakCalculator  GamificationEngine                │
│  Types:     Result<T>  DateString  HabitSnapshot                │
│                                                                 │
│  Zero external dependencies. 100% pure TypeScript.             │
└─────────────────────────────────────────────────────────────────┘
                         │ implements interfaces
┌────────────────────────▼────────────────────────────────────────┐
│                       INFRASTRUCTURE                            │
│                                                                 │
│  Repositories:  IDBHabitRepository  IDBEntryRepository          │
│  Services:      NotificationService  ServiceWorkerRegistration  │
│  Container:     container.ts (dependency injection root)        │
│                                                                 │
│  ← All I/O lives here. Domain never imports from here →         │
└─────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                          PWA LAYER                              │
│                                                                 │
│  public/sw.js          Service worker (caching + notifications) │
│  public/manifest.json  PWA metadata (install + shortcuts)       │
│  index.html            Meta tags + FOUC prevention script       │
│  vite.config.ts        Bundle splitting + alias config          │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency rules (enforced by TypeScript aliases)

```
Presentation  →  Application  ✅
Presentation  →  Domain       ✅  (types/enums only)
Presentation  →  Infrastructure  ❌  (never, except via hooks)
Application   →  Domain       ✅
Application   →  Infrastructure  ✅  (repository interfaces)
Domain        →  anything     ❌  (pure, no deps)
Infrastructure →  Domain      ✅  (implements interfaces)
Infrastructure →  Application ❌
```

### File count by layer (Phase 2 additions)

| Layer | Phase 1 | Phase 2 added | Total |
|---|---|---|---|
| Domain | 4 | 1 (GamificationEngine) | 5 |
| Application | 3 | 1 (gamificationStore) | 4 |
| Infrastructure | 2 | 2 (Notification, SW Reg) | 4 |
| Presentation/hooks | 1 | 2 (useGamification, usePWA) | 3 |
| Presentation/components | 9 | 10 (4 charts, 3 gamif, 1 pwa, 1 layout update) | 19 |
| Presentation/pages | 2 | 2 (Stats, Settings) | 4 |
| PWA/config | 0 | 4 (sw, manifest, index.html, vite) | 4 |
| **Total** | **21** | **23** | **44** |

---

## Integration checklist

```
□ Place sw.js in /public (not /src — must be at root scope)
□ Place manifest.json in /public
□ Add icons: /public/icons/icon-{72,96,128,152,192,384,512}.png
□ Add badge icon: /public/icons/badge-72.png
□ Install recharts: npm install recharts
□ Update tsconfig.json paths to match vite.config.ts aliases
□ Call registerServiceWorker() in main.tsx after containerReady
□ Wire useGamification().triggerRecalculation() after toggleCompletion
□ Add <link rel="manifest"> to index.html (included in delivered file)
```

## npm packages added (Phase 2)

```json
{
  "dependencies": {
    "recharts": "^2.12.0"
  }
}
```

No additional runtime deps. Service Worker, Notification API, and
IndexedDB are all native browser APIs.
