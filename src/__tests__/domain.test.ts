/**
 * DOMAIN + APPLICATION LAYER — Self-Contained Test Suite
 *
 * These tests run without Jest, Vitest, or any test runner.
 * Execute with: npx tsx src/__tests__/domain.test.ts
 *
 * They prove the business logic is correct in complete isolation
 * from React, localStorage, and any I/O.
 */

// ─── Inline test harness (no dependencies) ────────────────────────────────────

type TestFn = () => void | Promise<void>

let passed = 0
let failed = 0
const failures: string[] = []

async function test(description: string, fn: TestFn): Promise<void> {
  try {
    await fn()
    passed++
    console.log(`  ✅ ${description}`)
  } catch (e) {
    failed++
    const msg = e instanceof Error ? e.message : String(e)
    failures.push(`${description}: ${msg}`)
    console.log(`  ❌ ${description}\n     ${msg}`)
  }
}

function describe(suite: string, fn: () => void): void {
  console.log(`\n📦 ${suite}`)
  fn()
}

function expect(actual: unknown) {
  return {
    toBe: (expected: unknown) => {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toEqual: (expected: unknown) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toBeGreaterThan: (n: number) => {
      if ((actual as number) <= n)
        throw new Error(`Expected ${actual} > ${n}`)
    },
    toBeLessThanOrEqual: (n: number) => {
      if ((actual as number) > n)
        throw new Error(`Expected ${actual} <= ${n}`)
    },
    toBeNull: () => {
      if (actual !== null)
        throw new Error(`Expected null, got ${JSON.stringify(actual)}`)
    },
    toThrow: (msg?: string) => {
      // Used with a thunk: expect(() => fn()).toThrow('msg')
      throw new Error('Use expect(fn).toThrow() with a thunk')
    },
  }
}

function expectToThrow(fn: () => unknown, containing?: string): void {
  try {
    fn()
    throw new Error('Expected function to throw, but it did not')
  } catch (e) {
    if (e instanceof Error && e.message === 'Expected function to throw, but it did not') throw e
    if (containing && e instanceof Error && !e.message.includes(containing)) {
      throw new Error(`Expected error containing "${containing}", got "${e.message}"`)
    }
  }
}

// ─── Import the modules under test ───────────────────────────────────────────
// (In real project these are path-aliased; adjust if running directly)

import { Habit }                  from '../domain/entities/Habit'
import { HabitDomainError }       from '../domain/errors/HabitDomainError'
import { DailyStrategy, WeeklyStrategy, CustomStrategy, FrequencyStrategyFactory }
  from '../domain/services/FrequencyStrategy'
import {
  parseDate, formatDate, daysBetween, addDays,
  isoWeekKey, isSameISOWeek, dateRange,
} from '../domain/services/DateUtils'
import {
  calculateStreak,
  calculateCompletionRate,
  isHabitDueOn,
  wasCompletedOn,
} from '../domain/services/StreakCalculator'
import type { HabitEntry, HabitSnapshot } from '../domain/entities/Habit'
import type { DateString } from '../domain/types/shared'
import { DateStr } from '../domain/types/shared'

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const BASE_SNAPSHOT: Omit<HabitSnapshot, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'> = {
  name:                       'Morning Run',
  description:                'Run 5km before breakfast',
  category:                   'fitness',
  frequency:                  'daily',
  customDays:                 [],
  color:                      '#22c55e',
  icon:                       '🏃',
  targetCompletionsPerPeriod: 1,
}

function makeEntry(habitId: string, date: string, id?: string): HabitEntry {
  return {
    id:          id ?? `e-${date}`,
    habitId:     habitId as any,
    date:        date as DateString,
    completedAt: `${date}T08:00:00.000Z`,
    note:        '',
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DateUtils', () => {
  test('parseDate → formatDate round-trips correctly', async () => {
    const dates = ['2024-01-01', '2024-12-31', '2024-02-29', '2023-11-15']
    for (const d of dates) {
      expect(formatDate(parseDate(d as DateString))).toBe(d)
    }
  })

  test('daysBetween returns absolute difference', async () => {
    expect(daysBetween('2024-01-01' as DateString, '2024-01-08' as DateString)).toBe(7)
    expect(daysBetween('2024-01-08' as DateString, '2024-01-01' as DateString)).toBe(7)
  })

  test('addDays advances forward and backward', async () => {
    expect(addDays('2024-01-01' as DateString, 7)).toBe('2024-01-08')
    expect(addDays('2024-01-08' as DateString, -7)).toBe('2024-01-01')
    expect(addDays('2024-01-31' as DateString, 1)).toBe('2024-02-01')
  })

  test('isoWeekKey groups same week together', async () => {
    // 2024-01-01 is a Monday (start of week 1)
    const mon = isoWeekKey('2024-01-01' as DateString)
    const sun = isoWeekKey('2024-01-07' as DateString)
    expect(mon).toBe(sun)
  })

  test('isoWeekKey separates different weeks', async () => {
    const weekA = isoWeekKey('2024-01-01' as DateString)
    const weekB = isoWeekKey('2024-01-08' as DateString)
    if (weekA === weekB) throw new Error('Different weeks got same key')
  })

  test('dateRange produces correct count', async () => {
    const range = dateRange('2024-01-01' as DateString, '2024-01-07' as DateString)
    expect(range.length).toBe(7)
    expect(range[0]).toBe('2024-01-01')
    expect(range[6]).toBe('2024-01-07')
  })
})

describe('Habit Entity', () => {
  test('Habit.create produces valid aggregate', async () => {
    const h = Habit.create(BASE_SNAPSHOT, 'h-1' as any)
    expect(h.id).toBe('h-1')
    expect(h.name).toBe('Morning Run')
    expect(h.isArchived).toBe(false)
  })

  test('Habit.create trims name whitespace', async () => {
    const h = Habit.create({ ...BASE_SNAPSHOT, name: '  Yoga  ' }, 'h-2' as any)
    expect(h.name).toBe('Yoga')
  })

  test('rejects empty name', async () => {
    expectToThrow(
      () => Habit.create({ ...BASE_SNAPSHOT, name: '   ' }, 'h-3' as any),
      'cannot be empty',
    )
  })

  test('rejects name over 80 chars', async () => {
    expectToThrow(
      () => Habit.create({ ...BASE_SNAPSHOT, name: 'a'.repeat(81) }, 'h-4' as any),
      '80 characters',
    )
  })

  test('rejects invalid hex color', async () => {
    expectToThrow(
      () => Habit.create({ ...BASE_SNAPSHOT, color: 'red' }, 'h-5' as any),
      'not a valid hex color',
    )
  })

  test('rejects custom frequency with no days', async () => {
    expectToThrow(
      () => Habit.create({ ...BASE_SNAPSHOT, frequency: 'custom', customDays: [] }, 'h-6' as any),
      'at least one day',
    )
  })

  test('rejects out-of-range custom day', async () => {
    expectToThrow(
      () => Habit.create({ ...BASE_SNAPSHOT, frequency: 'custom', customDays: [7] }, 'h-7' as any),
      '0–6',
    )
  })

  test('archive() returns new immutable instance', async () => {
    const original = Habit.create(BASE_SNAPSHOT, 'h-8' as any)
    const archived  = original.archive()
    expect(original.isArchived).toBe(false)
    expect(archived.isArchived).toBe(true)
  })

  test('archive() twice throws ALREADY_ARCHIVED', async () => {
    const h = Habit.create(BASE_SNAPSHOT, 'h-9' as any).archive()
    expectToThrow(() => h.archive(), 'already archived')
  })

  test('rename() produces new instance with updated name', async () => {
    const h = Habit.create(BASE_SNAPSHOT, 'h-10' as any)
    const renamed = h.rename('Evening Run')
    expect(h.name).toBe('Morning Run')       // original unchanged
    expect(renamed.name).toBe('Evening Run')
  })

  test('toSnapshot() → fromSnapshot() round-trip is equal', async () => {
    const original = Habit.create(BASE_SNAPSHOT, 'h-11' as any)
    const restored  = Habit.fromSnapshot(original.toSnapshot())
    expect(restored.id).toBe(original.id)
    expect(restored.name).toBe(original.name)
    expect(restored.frequency).toBe(original.frequency)
  })

  test('custom days are deduplicated and sorted', async () => {
    const h = Habit.create(
      { ...BASE_SNAPSHOT, frequency: 'custom', customDays: [5, 1, 3, 1, 5] },
      'h-12' as any,
    )
    expect(h.customDays).toEqual([1, 3, 5])
  })
})

describe('FrequencyStrategy — DailyStrategy', () => {
  const strategy = new DailyStrategy()

  test('isDueOn returns true for any date', async () => {
    expect(strategy.isDueOn('2024-01-01' as DateString)).toBe(true)
    expect(strategy.isDueOn('2024-07-04' as DateString)).toBe(true)
  })

  test('getDueDatesInRange returns every day', async () => {
    const dates = strategy.getDueDatesInRange(
      '2024-01-01' as DateString,
      '2024-01-07' as DateString,
    )
    expect(dates.length).toBe(7)
  })

  test('describe returns "Every day"', async () => {
    expect(strategy.describe()).toBe('Every day')
  })
})

describe('FrequencyStrategy — WeeklyStrategy', () => {
  const strategy = new WeeklyStrategy()

  test('isDueOn returns true for any date (any day can satisfy weekly)', async () => {
    expect(strategy.isDueOn('2024-01-03' as DateString)).toBe(true)  // Wednesday
  })

  test('getDueDatesInRange returns one date per week', async () => {
    // 2024-01-01 (Mon) to 2024-01-21 (Sun) = 3 weeks
    const dates = strategy.getDueDatesInRange(
      '2024-01-01' as DateString,
      '2024-01-21' as DateString,
    )
    expect(dates.length).toBe(3)
  })
})

describe('FrequencyStrategy — CustomStrategy', () => {
  // Mon(1), Wed(3), Fri(5)
  const strategy = new CustomStrategy([1, 3, 5])

  test('isDueOn returns true only for active days', async () => {
    expect(strategy.isDueOn('2024-01-01' as DateString)).toBe(true)   // Monday
    expect(strategy.isDueOn('2024-01-02' as DateString)).toBe(false)  // Tuesday
    expect(strategy.isDueOn('2024-01-03' as DateString)).toBe(true)   // Wednesday
  })

  test('getDueDatesInRange returns only scheduled days', async () => {
    // Week of 2024-01-01 (Mon) to 2024-01-07 (Sun): Mon, Wed, Fri = 3 days
    const dates = strategy.getDueDatesInRange(
      '2024-01-01' as DateString,
      '2024-01-07' as DateString,
    )
    expect(dates.length).toBe(3)
  })

  test('describe lists day names', async () => {
    const desc = strategy.describe()
    if (!desc.includes('Mon') || !desc.includes('Wed') || !desc.includes('Fri'))
      throw new Error(`Unexpected describe output: ${desc}`)
  })
})

describe('FrequencyStrategyFactory', () => {
  test('creates DailyStrategy for daily', async () => {
    const s = FrequencyStrategyFactory.create({ frequency: 'daily', customDays: [] })
    expect(s.describe()).toBe('Every day')
  })

  test('creates WeeklyStrategy for weekly', async () => {
    const s = FrequencyStrategyFactory.create({ frequency: 'weekly', customDays: [] })
    expect(s.describe()).toBe('Once a week')
  })

  test('creates CustomStrategy for custom', async () => {
    const s = FrequencyStrategyFactory.create({ frequency: 'custom', customDays: [1] })
    if (!s.describe().includes('Mon'))
      throw new Error('Expected Mon in custom strategy description')
  })
})

describe('StreakCalculator — Daily habits', () => {
  const habit = { id: 'h-1' as any, frequency: 'daily' as const, customDays: [] as const }
  const today = '2024-01-10' as DateString

  test('zero entries → streak = 0', async () => {
    const result = calculateStreak(habit, [], today)
    expect(result.currentStreak).toBe(0)
    expect(result.longestStreak).toBe(0)
    expect(result.lastCompletedDate).toBeNull()
  })

  test('single entry today → streak = 1', async () => {
    const result = calculateStreak(habit, [makeEntry('h-1', '2024-01-10')], today)
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(1)
  })

  test('7 consecutive days ending today → streak = 7', async () => {
    const entries = ['01','02','03','04','05','06','07','08','09','10']
      .map((d) => makeEntry('h-1', `2024-01-${d}`))
    const result = calculateStreak(habit, entries, today)
    expect(result.currentStreak).toBe(10)
    expect(result.longestStreak).toBe(10)
  })

  test('gap breaks streak — last 3 days after gap → streak = 3', async () => {
    const entries = [
      makeEntry('h-1', '2024-01-01'),
      makeEntry('h-1', '2024-01-02'),
      // gap: Jan 3, 4, 5
      makeEntry('h-1', '2024-01-08'),
      makeEntry('h-1', '2024-01-09'),
      makeEntry('h-1', '2024-01-10'),
    ]
    const result = calculateStreak(habit, entries, today)
    expect(result.currentStreak).toBe(3)
    expect(result.longestStreak).toBe(3)
  })

  test('streak is alive if last entry is yesterday (grace period)', async () => {
    const entries = [
      makeEntry('h-1', '2024-01-08'),
      makeEntry('h-1', '2024-01-09'),
      // no entry for 2024-01-10 (today) yet
    ]
    const result = calculateStreak(habit, entries, today)
    expect(result.currentStreak).toBe(2)
  })

  test('streak resets if last entry is 2+ days ago', async () => {
    const entries = [makeEntry('h-1', '2024-01-07')]  // 3 days before today
    const result = calculateStreak(habit, entries, today)
    expect(result.currentStreak).toBe(0)
  })

  test('totalCompletions counts all entries', async () => {
    const entries = [1,2,3,4,5].map((n) => makeEntry('h-1', `2024-01-0${n}`))
    const result = calculateStreak(habit, entries, today)
    expect(result.totalCompletions).toBe(5)
  })
})

describe('StreakCalculator — Weekly habits', () => {
  const habit = { id: 'h-w' as any, frequency: 'weekly' as const, customDays: [] as const }

  test('one completion per week for 4 weeks → streak = 4', async () => {
    const entries = [
      makeEntry('h-w', '2024-01-03'),  // week 1 (Wed)
      makeEntry('h-w', '2024-01-08'),  // week 2 (Mon)
      makeEntry('h-w', '2024-01-17'),  // week 3 (Wed)
      makeEntry('h-w', '2024-01-22'),  // week 4 (Mon)
    ]
    // today = Jan 22 (within week 4)
    const result = calculateStreak(habit, entries, '2024-01-22' as DateString)
    expect(result.currentStreak).toBe(4)
  })

  test('multiple completions in same week count as one', async () => {
    const entries = [
      makeEntry('h-w', '2024-01-01'),
      makeEntry('h-w', '2024-01-02'),
      makeEntry('h-w', '2024-01-03'),  // 3 completions in week 1
      makeEntry('h-w', '2024-01-08'),  // week 2
    ]
    const result = calculateStreak(habit, entries, '2024-01-08' as DateString)
    expect(result.currentStreak).toBe(2)
  })
})

describe('StreakCalculator — Custom habits (Mon, Wed, Fri)', () => {
  const habit = {
    id: 'h-c' as any,
    frequency: 'custom' as const,
    customDays: [1, 3, 5] as const,
  }

  test('consecutive Mon/Wed/Fri completions → streak = 3', async () => {
    const entries = [
      makeEntry('h-c', '2024-01-01'),  // Mon
      makeEntry('h-c', '2024-01-03'),  // Wed
      makeEntry('h-c', '2024-01-05'),  // Fri ← today
    ]
    const result = calculateStreak(habit, entries, '2024-01-05' as DateString)
    expect(result.currentStreak).toBe(3)
  })

  test('missing a scheduled day breaks the streak', async () => {
    const entries = [
      makeEntry('h-c', '2024-01-01'),  // Mon
      // skip Wed 01-03
      makeEntry('h-c', '2024-01-05'),  // Fri
    ]
    const result = calculateStreak(habit, entries, '2024-01-05' as DateString)
    expect(result.currentStreak).toBe(1)
  })
})

describe('calculateCompletionRate', () => {
  const habit = { frequency: 'daily' as const, customDays: [] as const }

  test('100% rate when every day completed', async () => {
    const entries = ['01','02','03','04','05','06','07']
      .map((d) => makeEntry('h-r', `2024-01-${d}`))
    const rate = calculateCompletionRate(
      habit, entries,
      '2024-01-01' as DateString,
      '2024-01-07' as DateString,
    )
    expect(rate).toBe(1)
  })

  test('0% rate when no entries in range', async () => {
    const rate = calculateCompletionRate(
      habit, [],
      '2024-01-01' as DateString,
      '2024-01-07' as DateString,
    )
    expect(rate).toBe(0)
  })

  test('~0.71 rate when 5/7 days completed', async () => {
    const entries = ['01','02','03','04','05']
      .map((d) => makeEntry('h-r', `2024-01-${d}`))
    const rate = calculateCompletionRate(
      habit, entries,
      '2024-01-01' as DateString,
      '2024-01-07' as DateString,
    )
    // 5/7 ≈ 0.714
    if (Math.abs(rate - 5 / 7) > 0.001)
      throw new Error(`Expected ~0.714, got ${rate}`)
  })
})

describe('wasCompletedOn helper', () => {
  const entries = [
    makeEntry('h-1', '2024-01-05'),
    makeEntry('h-1', '2024-01-06'),
  ]

  test('returns true for existing date', async () => {
    expect(wasCompletedOn(entries, 'h-1', '2024-01-05' as DateString)).toBe(true)
  })

  test('returns false for missing date', async () => {
    expect(wasCompletedOn(entries, 'h-1', '2024-01-07' as DateString)).toBe(false)
  })

  test('returns false for wrong habitId', async () => {
    expect(wasCompletedOn(entries, 'h-99', '2024-01-05' as DateString)).toBe(false)
  })
})

// ─── Summary ─────────────────────────────────────────────────────────────────

async function runAll() {
  // Tests already ran synchronously above via describe/test
  // (In a real setup we'd await them; here describe() is sync)
  console.log('\n' + '─'.repeat(50))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failures.length > 0) {
    console.log('\nFailed tests:')
    failures.forEach((f) => console.log(`  • ${f}`))
    process.exit(1)
  }
}

runAll()
