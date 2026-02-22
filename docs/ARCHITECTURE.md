# Habitual — Phase 3: Category, Tag & Filter System
## Architecture & Implementation Guide

---

## 1. Updated Domain Model

### Changes to `Habit` entity

```typescript
// BEFORE (Phase 1/2)
interface Habit {
  id, name, category, frequency, customDays, createdAt, archivedAt
}

// AFTER (Phase 3) — all new fields optional for backward compat
interface Habit {
  id, name, category, frequency, customDays, createdAt, archivedAt

  tags?:   string[]   // ["morning", "quick", "health"]
  color?:  string     // "#22c55e" — overrides category default
  icon?:   string     // "🏃" — emoji, max 4 codepoints
}
```

**Backward compatibility guarantee:**
- All new fields are `?` (optional TypeScript) — old persisted records hydrate fine
- IDB migration (v1 → v2) adds `tags: [], color: undefined, icon: undefined` to every existing record
- `resolveHabitColor()` falls back to category default if no custom color

### New category list (extended from Phase 1/2)

| Category | Emoji | Default Color |
|---|---|---|
| health | ❤️ | #ef4444 |
| fitness | 💪 | #f97316 |
| mindfulness | 🧘 | #8b5cf6 |
| learning | 📚 | #3b82f6 |
| productivity | ⚡ | #eab308 |
| social | 🤝 | #ec4899 |
| finance | 💰 | #10b981 |
| **creative** *(new)* | 🎨 | #f59e0b |
| **nutrition** *(new)* | 🥗 | #22c55e |
| **sleep** *(new)* | 😴 | #6366f1 |
| other | ✨ | #94a3b8 |

### New domain functions

```typescript
// Normalise raw tag string: "  Morning Routine  " → "morning-routine"
normaliseTag(raw: string): string | null

// Validate tags array (max 10, pattern check, dedup)
validateTags(raw: string[]): { valid: true; tags: string[] } | { valid: false; error: string }

// Resolve display color: custom hex → category default
resolveHabitColor(habit): string
```

### Gamification compatibility

`GamificationEngine` is **untouched**. It reads:
- `habit.category` → category count badge (still works, more categories = still valid)
- `totalCompletions` → milestone badges (untouched)
- `currentStreak` → streak badges (untouched)

`CategoryRadarChart` reads `habit.category` and `habit.completionRateLastMonth` — both untouched.

---

## 2. Updated Repository Interface

### New methods on `IHabitRepository`

```typescript
// Previously: only findAll() with no options
findAll(options?: GetHabitsOptions): Promise<Habit[]>

interface GetHabitsOptions {
  includeArchived?: boolean
  category?:        HabitCategory | null
  tags?:            string[]
  tagMode?:         'any' | 'all'    // OR vs AND
}

// New in Phase 3:
getAllTags(): Promise<string[]>               // for filter UI
getActiveCategories(): Promise<HabitCategory[]>  // for filter UI
update(dto: UpdateHabitDTO): Promise<Habit>  // edit without touching entries
```

### What did NOT change

All existing method signatures (`findById`, `create`, `delete`, `archive`,
`findEntriesForDate`, `findEntriesForHabit`, `findAllEntries`,
`createEntry`, `deleteEntry`, `entryExists`) are **identical to Phase 1/2**.
Use cases that call these methods require **zero changes**.

---

## 3. Updated Infrastructure Implementation

### IDB Version bump: 1 → 2

```javascript
const DB_VERSION = 2

req.onupgradeneeded = (event) => {
  if (event.oldVersion < 2) {
    // Add by_tag multiEntry index to existing habits store
    habitsStore.createIndex('by_tag', 'tags', { unique: false, multiEntry: true })

    // Migrate existing records: add safe defaults
    habitsStore.openCursor().onsuccess = (cursor) => {
      cursor.update({ ...cursor.value, tags: [], color: undefined, icon: undefined })
      cursor.continue()
    }
  }
}
```

### IDB multiEntry index for tags

The `by_tag` index uses `multiEntry: true` — IDB creates an index entry
for EACH element of the `tags` array. This enables:

```typescript
// getAllTags() — efficient: iterate index keys (no full scan needed)
store.index('by_tag').openKeyCursor()
// Each cursor key IS a tag string — collect in a Set → sorted array

// findAll({ tags: ['morning'] }) — JS-side filter (simpler than IDB cursor)
habits.filter(h => h.tags?.includes('morning'))
```

The tradeoff: category filtering uses the IDB index (fast), tag filtering
uses JS after a category-filtered fetch (still fast, tags narrow the set).

### update() — partial write

```typescript
async update(dto: UpdateHabitDTO): Promise<Habit> {
  const existing = await this.findById(dto.id)
  // Spread existing, overwrite only provided fields
  // Does NOT touch: createdAt, archivedAt, or entries
  const updated = { ...existing, ...providedFields }
  await store.put(updated)
  return updated
}
```

---

## 4. UI Changes

### New components

| Component | Purpose | Props shape |
|---|---|---|
| `CategoryFilter` | Horizontal tab strip | `categories, activeCategory, onChange` |
| `TagFilter` | Pill toggle panel + AND/OR mode | `availableTags, activeTags, tagMode, onToggle` |
| `FilterBar` | Composite: category + tag + sort + groupBy | `habits` (for counts) |
| `TagBadge` | Single colored tag pill | `tag, onClick?, isActive?` |
| `TagList` | N visible + "+M more" overflow | `tags, maxVisible, onTagClick?` |
| `CategoryGroup` | Collapsible grouped section | `category, habits, completedIds` |
| `EditHabitModal` | Pre-populated edit form | `habit, isOpen, onClose, onSubmit` |

### Updated components

| Component | What changed |
|---|---|
| `HabitCard` | + left color stripe, category badge, tag pills, edit button |
| `CreateHabitModal` | + tags input, color picker, icon input |
| `HabitsPage` | + FilterBar, grouped view, EditHabitModal, stable onTagClick |

### HabitCard color stripe

```
┌──┬──────────────────────────────────────────────────┐
│▊▊│ ✅  🏃 Morning Run                [fitness] [💪] │
│  │    #morning  #quick                             ✏️│
│  │    🔥 12d  ████████░░░░  85%                 🗑️  │
└──┴──────────────────────────────────────────────────┘
 ↑
 2px color stripe
 resolveHabitColor(habit)
```

### CategoryGroup structure (grouped view)

```
┌─── 💪 Fitness  ●●●  2/3 ────── ⌄ ─┐
│  ┌────────────────────────────────┐│
│  │ HabitCard: Morning Run        ││
│  │ HabitCard: Evening Stretch    ││
│  │ HabitCard: Weekly Weights     ││
│  └────────────────────────────────┘│
└────────────────────────────────────┘
```

The circular progress arc in the header shows completion ratio for that category.

---

## 5. Filter Logic Explanation

### Data flow

```
User interaction
      │
      ▼
filterStore.setCategory() / filterStore.toggleTag()
      │
      ▼ (triggers useEffect via fetchHabits dependency change)
useHabits.fetchHabits()
      │
      ▼
useCases.getHabits.execute({ category, tags, tagMode })
      │
      ▼
IHabitRepository.findAll({ category, tags, tagMode })
      │
      ├─→ IDB by_category index (if category selected)
      └─→ JS-side tag filter (if tags selected)
      │
      ▼
habitStore.setHabits([filtered habits])
      │
      ▼
useHabits.sortedHabits (useMemo on sortBy)
      │
      ▼
useHabits.displayHabits (useMemo, optionally hides completed)
      │
      ▼
useHabits.groupedHabits (useMemo, Map<category, habits[]> if groupBy='category')
      │
      ▼
HabitsPage renders flat list OR CategoryGroup × N
```

### Where each concern lives

| Concern | Layer | File |
|---|---|---|
| Active filter state | Application | `filterStore.ts` |
| Available options (cats/tags) | Application | `filterStore.ts` (populated by hook) |
| Filter→query mapping | Presentation (hook) | `useHabits.ts` |
| Category index query | Infrastructure | `IDBHabitRepository.ts` |
| Tag array filter | Infrastructure | `IDBHabitRepository.ts` |
| Sort logic | Presentation (hook) | `useHabits.ts` |
| Grouping logic | Presentation (hook) | `useHabits.ts` |
| Category tab UI | Presentation | `CategoryFilter.tsx` |
| Tag pill UI | Presentation | `TagFilter.tsx` |
| Combined control panel | Presentation | `FilterBar.tsx` |

### Filter interaction rules

**Category filter:**
- Selecting a tab → `setCategory(cat)` → triggers refetch
- Clicking active tab again → `setCategory(null)` → shows all
- Only one category active at a time

**Tag filter (multi-select with AND/OR):**
- Each pill is a toggle: `toggleTag(tag)`
- Default mode: OR (any selected tag matches)
- When ≥2 tags selected: AND/OR toggle appears
- Tags filter WITHIN the active category

**Clearing filters:**
- "Clear all" button → `clearFilters()` → resets category + tags
- Category click on active → deselects
- Individual tag click on active → deselects

**showCompleted toggle:**
- `false` → `displayHabits` excludes habits in `completedIds` (JS filter after fetch)
- This is display-only — does not affect the repository query

---

## 6. Render Optimization Notes

### filterStore separation

Filter state is in a SEPARATE Zustand store from `habitStore`.
This means:
- A category change does NOT cause `habitStore` subscribers to re-render
- A habit completion does NOT cause `filterStore` subscribers to re-render
- `FilterBar` subscribes to `filterStore`, `HabitCard` subscribes to its own props

### Granular selectors throughout

```typescript
// BAD — re-renders on ANY store change
const store = useFilterStore()

// GOOD — re-renders ONLY when activeCategory changes
const activeCategory = useFilterStore((s) => s.activeCategory)
```

Every consumer uses the minimal selector pattern.

### Memoized derivations in useHabits

```typescript
// Only recomputed when habits or sortBy changes
const sortedHabits = useMemo(() => [...habits].sort(comparator), [habits, sortBy])

// Only recomputed when sortedHabits or showCompleted or completedIds changes
const displayHabits = useMemo(() => filter(sortedHabits), [sortedHabits, showCompleted, completedIds])

// Only recomputed when displayHabits or groupBy changes
const groupedHabits = useMemo(() => buildMap(displayHabits), [displayHabits, groupBy])
```

Total: **3 chained memoizations** — each only runs when its specific inputs change.

### CategoryGroup collapse state

Local `useState` (not store) — collapses independently per group.
This means toggling one group doesn't re-render sibling groups.

### onTagClick stability

`handleTagClick` in HabitsPage is wrapped in `useCallback`:
```typescript
const handleTagClick = useCallback((tag: string) => toggleTag(tag), [toggleTag])
```
`toggleTag` is a store action — it has a stable reference from Zustand.
So `handleTagClick` is stable → no unnecessary `HabitCard` re-renders.

### React.memo coverage

| Component | memo'd | Re-renders when |
|---|---|---|
| `HabitCard` | ✅ | habit data, isCompleted, activeTags |
| `CategoryGroup` | ✅ | habits array, completedIds, category |
| `CategoryFilter` | ✅ | categories, activeCategory |
| `TagFilter` | ✅ | availableTags, activeTags, tagMode |
| `TagPill` | ✅ | tag, isActive |
| `TagBadge` | ✅ | tag, isActive |
| `FilterBar` | ✅ | habits (for counts) |
| `Tab` (in CategoryFilter) | ✅ | label, count, isActive |

---

## Integration Notes

### 1. Install the updated store in your container

```typescript
// container.ts additions
import { UpdateHabitUseCase } from '@application/useCases/UpdateHabit'

const useCases = {
  // existing...
  updateHabit:      new UpdateHabitUseCase(habitRepo, getSnapshotForHabit),
  getActiveCategories: { execute: () => habitRepo.getActiveCategories() },
  getAllTags:           { execute: () => habitRepo.getAllTags() },
}
```

### 2. IDB migration is automatic

The version bump from 1 → 2 triggers `onupgradeneeded` on existing users.
The migration runs in the same transaction as the schema change.
No manual migration step needed.

### 3. Add FilterBar to HabitsPage

```tsx
// Replace old filter tabs with:
<FilterBar habits={allHabits} />
```

`allHabits` is the unfiltered list (from `useHabitStore(s => s.habits)` before
any filter is applied). This gives FilterBar accurate counts per category.

### 4. Category count computation

The count shown in each category tab is computed from `allHabits` in `FilterBar`:

```typescript
const categoryCounts = habits.reduce((acc, h) => {
  acc[h.category] = (acc[h.category] ?? 0) + 1
  return acc
}, {})
```

This runs once per FilterBar render. Since FilterBar is memo'd and only
re-renders when `allHabits` changes, this is efficient.

### 5. npm packages — no new dependencies

Everything uses existing packages (Zustand, React, Lucide). No new installs needed.

---

## File listing (Phase 3 additions / replacements)

```
src/
├── domain/
│   └── entities/
│       └── Habit.ts                    ← UPDATED (tags, color, icon, validation helpers)
├── domain/
│   └── repositories/
│       └── IHabitRepository.ts         ← UPDATED (getAllTags, getActiveCategories, update, options)
├── infrastructure/
│   └── repositories/
│       └── IDBHabitRepository.ts       ← UPDATED (v2 migration, by_tag index, update method)
├── application/
│   ├── stores/
│   │   └── filterStore.ts              ← NEW
│   └── useCases/
│       └── UpdateHabit.ts              ← NEW
├── presentation/
│   ├── hooks/
│   │   └── useHabits.ts                ← UPDATED (filter wiring, groupedHabits, updateHabit)
│   ├── components/
│   │   ├── filters/
│   │   │   ├── CategoryFilter.tsx      ← NEW
│   │   │   ├── TagFilter.tsx           ← NEW
│   │   │   └── FilterBar.tsx           ← NEW
│   │   ├── ui/
│   │   │   └── TagBadge.tsx            ← NEW
│   │   └── habits/
│   │       ├── HabitCard.tsx           ← UPDATED (color stripe, tags, category badge, edit btn)
│   │       ├── HabitModals.tsx         ← UPDATED (tags/color/icon input + EditHabitModal)
│   │       └── CategoryGroup.tsx       ← NEW
│   └── pages/
│       └── HabitsPage.tsx              ← UPDATED (FilterBar, grouped view, EditHabitModal)
```
