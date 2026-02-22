# Habitual — Habit Tracker

> A scalable React + Vite + TailwindCSS habit tracker built on a clean layered architecture.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
```

---

## Installation & Dependency Notes

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `vite` + `@vitejs/plugin-react` | Build tooling (fast HMR) |
| `typescript` | Static typing |
| `tailwindcss` + `postcss` + `autoprefixer` | Utility-first styling |
| `react-router-dom` | Client-side routing |
| `zustand` | Lightweight state management |
| `clsx` + `tailwind-merge` | Safe class merging (`cn()` utility) |
| `lucide-react` | Icon set |
| `date-fns` | Date arithmetic (used in Phase 2) |

---

## Folder Structure

```
src/
│
├── domain/                        # ① DOMAIN — pure business logic
│   ├── entities/
│   │   └── Habit.ts               # Habit, HabitEntry, HabitStreak types
│   ├── interfaces/
│   │   └── repositories.ts        # IHabitRepository, IHabitEntryRepository
│   └── types/
│       └── shared.ts              # Result<T>, DateString, Theme
│
├── application/                   # ② APPLICATION — use cases + state
│   ├── stores/
│   │   ├── uiStore.ts             # Theme, sidebar — persisted Zustand store
│   │   └── habitStore.ts          # Habits + entries — Zustand store
│   ├── useCases/
│   │   └── habitUseCases.ts       # loadHabits, createHabit, toggleCompletion
│   └── services/                  # (empty — streak calc, analytics go here)
│
├── infrastructure/                # ③ INFRASTRUCTURE — data adapters
│   ├── persistence/
│   │   ├── localHabitRepository.ts   # localStorage impl of IHabitRepository
│   │   └── localEntryRepository.ts   # localStorage impl of IHabitEntryRepository
│   └── adapters/
│       └── container.ts           # DI container — wires repos to use cases
│
└── presentation/                  # ④ PRESENTATION — React UI
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx          # Variant + size button primitive
    │   │   └── Badge.tsx           # Category / status badge
    │   ├── layout/
    │   │   ├── AppLayout.tsx       # Page shell (sidebar + topbar + outlet)
    │   │   ├── Sidebar.tsx         # Nav links
    │   │   └── Topbar.tsx          # Page title + dark mode toggle
    │   └── habits/
    │       └── HabitCard.tsx       # Single habit row with toggle
    ├── pages/
    │   ├── router.tsx              # createBrowserRouter config
    │   ├── DashboardPage.tsx       # Stats overview (placeholder)
    │   ├── HabitsPage.tsx          # Habit list + progress bar ← MAIN PAGE
    │   └── PlaceholderPages.tsx    # Stats, Settings stubs
    ├── hooks/
    │   └── useThemeInit.ts         # Syncs persisted theme → <html> class
    └── styles/
        ├── globals.css             # Tailwind directives + base layer
        └── cn.ts                   # clsx + twMerge utility
```

---

## Architecture Decisions

### Why 4-Layer Architecture?

```
Presentation ──► Application ──► Domain
                     │
              Infrastructure ──► Domain (implements interfaces)
```

Each layer has **one direction of dependency**. The Domain layer knows nothing about React, localStorage, or Zustand — it's plain TypeScript. This means:

- You can swap **localStorage → REST API** by replacing only `infrastructure/`.
- You can swap **Zustand → Redux** by changing only `application/stores/`.
- You can test domain logic and use cases **without mounting React**.

---

### Domain Layer

Holds the *language of the problem*. Zero imports from other layers. Pure TypeScript interfaces and types.

- **`Habit`** entity: what a habit *is* (name, category, frequency, etc.)
- **`HabitEntry`**: a single completion record
- **`IHabitRepository`**: contract — *what* operations exist, not *how*
- **`Result<T>`**: typed success/failure wrapper (no exceptions crossing boundaries)

---

### Application Layer

Orchestrates the domain. Contains:

- **Zustand stores** — reactive state containers. Stores are *thin*; they hold data and dispatch actions. Business logic lives in use cases.
- **Use Cases** — each function = one user intention (`loadHabits`, `createHabit`, `toggleHabitCompletion`). Accepts repos as parameters → easy to test with mocks.

---

### Infrastructure Layer

Concrete implementations of domain interfaces:

- **`localHabitRepository`** — reads/writes `localStorage` as JSON
- **`localEntryRepository`** — same pattern for entries
- **`container.ts`** — the DI root. To go from localStorage → a real API, only this file and the new adapter file need to change.

---

### Presentation Layer

React components organized by role:

| Folder | Contains |
|---|---|
| `ui/` | Atomic, stateless primitives (Button, Badge, Input, …) |
| `layout/` | App shell wrappers (AppLayout, Sidebar, Topbar) |
| `habits/` | Feature-specific components (HabitCard, HabitForm) |
| `pages/` | Route-level page components + router config |
| `hooks/` | Custom React hooks (`useThemeInit`, …) |
| `styles/` | Global CSS, Tailwind config, `cn()` utility |

---

### Dark Mode

Controlled via **CSS `class` strategy** (Tailwind's `darkMode: 'class'`). The `useUIStore` in Zustand:
1. Persists the user's chosen theme (`'light' | 'dark' | 'system'`) to `localStorage`.
2. On every change, calls `document.documentElement.classList.toggle('dark', ...)`.
3. On app boot, `useThemeInit` re-applies the class from the persisted value.

---

### Path Aliases

All four layers are aliased in `vite.config.ts` and `tsconfig.json`:

```ts
import { Button } from '@presentation/components/ui/Button'
import type { Habit } from '@domain/entities/Habit'
import { useHabitStore } from '@application/stores/habitStore'
import { container } from '@infrastructure/adapters/container'
```

No relative `../../` chains anywhere.

---

## Phase 2 Checklist

- [ ] Wire `loadHabits` use case to real localStorage on page mount
- [ ] Implement `createHabit` use case + AddHabitModal component
- [ ] Implement streak calculation in `application/services/`
- [ ] Wire `StatsPage` with recharts bar/line charts
- [ ] Add `SettingsPage` (name, notifications, data export)
- [ ] Add `useHabitEntries` selector hook
- [ ] Write unit tests for domain types and use cases

---

## Scripts

```bash
npm run dev          # start dev server
npm run build        # TypeScript check + Vite production build
npm run preview      # preview the production build locally
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (no emit, just type errors)
```
