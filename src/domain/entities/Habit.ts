/**
 * DOMAIN LAYER — Habit Entity (Phase 3)
 *
 * Changes from Phase 1/2:
 *   + tags      string[]   — user-defined labels, e.g. ["morning", "health"]
 *   + color     string?    — hex color for visual grouping, e.g. "#22c55e"
 *   + icon      string?    — emoji or icon key, e.g. "🏃" or "running"
 *
 * Backward compatibility guarantee:
 *   All new fields are OPTIONAL with safe defaults so existing persisted
 *   habits (which have none of these fields) hydrate without errors.
 *
 * ─── Invariants (enforced in HabitFactory) ────────────────────────────────────
 *   • name        must be 1–100 chars
 *   • category    must be one of HABIT_CATEGORIES
 *   • tags        max 10 tags, each 1–30 chars, lowercase, no spaces
 *   • color       must be valid hex (#rrggbb) or undefined
 *   • icon        must be ≤ 4 chars (emoji) or undefined
 *
 * ─── CRITICAL: Do NOT change existing field names or types ────────────────────
 *   streak, completionRateLastMonth, etc. are consumed by GamificationEngine.
 *   CategoryRadarChart reads .category. Do not rename.
 */

export type HabitFrequency = 'daily' | 'weekly' | 'custom'

/**
 * Canonical category list.
 * GamificationEngine.evaluateBadges() counts unique categories — add here freely,
 * the badge predicate uses `categoryCount >= 4` which remains valid.
 */
export const HABIT_CATEGORIES = [
  'health',
  'fitness',
  'mindfulness',
  'learning',
  'productivity',
  'social',
  'finance',
  'creative',
  'nutrition',
  'sleep',
  'other',
] as const

export type HabitCategory = (typeof HABIT_CATEGORIES)[number]

export const CATEGORY_META: Record<
  HabitCategory,
  { label: string; emoji: string; defaultColor: string }
> = {
  health:       { label: 'Health',       emoji: '❤️',  defaultColor: '#ef4444' },
  fitness:      { label: 'Fitness',      emoji: '💪',  defaultColor: '#f97316' },
  mindfulness:  { label: 'Mindfulness',  emoji: '🧘',  defaultColor: '#8b5cf6' },
  learning:     { label: 'Learning',     emoji: '📚',  defaultColor: '#3b82f6' },
  productivity: { label: 'Productivity', emoji: '⚡',  defaultColor: '#eab308' },
  social:       { label: 'Social',       emoji: '🤝',  defaultColor: '#ec4899' },
  finance:      { label: 'Finance',      emoji: '💰',  defaultColor: '#10b981' },
  creative:     { label: 'Creative',     emoji: '🎨',  defaultColor: '#f59e0b' },
  nutrition:    { label: 'Nutrition',    emoji: '🥗',  defaultColor: '#22c55e' },
  sleep:        { label: 'Sleep',        emoji: '😴',  defaultColor: '#6366f1' },
  other:        { label: 'Other',        emoji: '✨',  defaultColor: '#94a3b8' },
}

// ─── Core entity types ────────────────────────────────────────────────────────

export interface Habit {
  readonly id:        string
  readonly name:      string
  readonly category:  HabitCategory
  readonly frequency: HabitFrequency
  readonly customDays?: number[]       // 0=Sun … 6=Sat (used when frequency='custom')
  readonly createdAt: string           // ISO 8601

  // Phase 3 additions — all optional for backward compat
  readonly tags?:   string[]           // e.g. ["morning", "quick"]
  readonly color?:  string             // hex "#rrggbb" — overrides category default
  readonly icon?:   string             // emoji e.g. "🏃" or icon key

  readonly archivedAt?: string | null  // null = active
}

/**
 * HabitSnapshot — read model returned by use cases and stored in Zustand.
 * Adds computed fields (streak, completionRate, etc.) so UI never recalculates.
 *
 * NOTE: The shape below must remain compatible with:
 *   • GamificationEngine.evaluateBadges()   — reads .category, totalCompletions
 *   • CategoryRadarChart                     — reads .category, .completionRateLastMonth
 *   • StreakLineChart                         — reads .currentStreak, .id
 */
export interface HabitSnapshot extends Habit {
  // Computed by use case, NOT stored in IDB
  readonly currentStreak:          number
  readonly longestStreak:          number
  readonly completionRateLastMonth: number   // 0–1
  readonly totalCompletions:       number
  readonly isDueToday:             boolean
  readonly lastCompletedAt:        string | null
}

export interface HabitEntry {
  readonly id:          string
  readonly habitId:     string
  readonly date:        string           // YYYY-MM-DD
  readonly completedAt: string           // ISO 8601 (used for time-of-day badge checks)
  readonly note?:       string
}

// ─── Value objects ────────────────────────────────────────────────────────────

/**
 * CreateHabitDTO — what the UI sends to CreateHabit use case.
 * Tags validated here before hitting domain.
 */
export interface CreateHabitDTO {
  name:        string
  category:    HabitCategory
  frequency:   HabitFrequency
  customDays?: number[]
  tags?:       string[]
  color?:      string
  icon?:       string
}

export interface UpdateHabitDTO {
  id:          string
  name?:       string
  category?:   HabitCategory
  frequency?:  HabitFrequency
  customDays?: number[]
  tags?:       string[]
  color?:      string
  icon?:       string
}

// ─── Validation ───────────────────────────────────────────────────────────────

export const HABIT_CONSTRAINTS = {
  NAME_MIN:      1,
  NAME_MAX:      100,
  TAG_MAX_COUNT: 10,
  TAG_MAX_LEN:   30,
  TAG_PATTERN:   /^[a-z0-9-]+$/,     // lowercase alphanumeric + hyphens
  COLOR_PATTERN: /^#[0-9a-f]{6}$/i,
  ICON_MAX_LEN:  4,                   // allows multi-codepoint emoji
} as const

/**
 * Normalise a raw tag string:
 *   "  Morning Routine  " → "morning-routine"
 * Returns null if the result is empty or too long.
 */
export function normaliseTag(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (!clean || clean.length > HABIT_CONSTRAINTS.TAG_MAX_LEN) return null
  return clean
}

/**
 * Validate tags array. Returns { valid: true, tags } or { valid: false, error }.
 */
export function validateTags(
  raw: string[],
): { valid: true; tags: string[] } | { valid: false; error: string } {
  if (raw.length > HABIT_CONSTRAINTS.TAG_MAX_COUNT) {
    return { valid: false, error: `Maximum ${HABIT_CONSTRAINTS.TAG_MAX_COUNT} tags allowed` }
  }
  const tags: string[] = []
  for (const r of raw) {
    const t = normaliseTag(r)
    if (!t) return { valid: false, error: `Invalid tag: "${r}"` }
    if (!tags.includes(t)) tags.push(t)   // deduplicate
  }
  return { valid: true, tags }
}

/**
 * Resolve effective color for a habit — custom color → category default.
 */
export function resolveHabitColor(habit: Pick<Habit, 'color' | 'category'>): string {
  if (habit.color && HABIT_CONSTRAINTS.COLOR_PATTERN.test(habit.color)) return habit.color
  return CATEGORY_META[habit.category]?.defaultColor ?? '#94a3b8'
}
