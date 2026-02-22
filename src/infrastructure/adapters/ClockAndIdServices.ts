/**
 * INFRASTRUCTURE LAYER — Clock & ID Generator Implementations
 *
 * These are the real implementations of the application-layer service interfaces.
 * They are isolated here so tests can substitute fakes without touching any
 * use case or domain code.
 */

import type { IIdGenerator }     from '@application/services/IIdGenerator'
import type { IClockService }    from '@application/services/IClockService'
import type { HabitId, EntryId, DateString, Timestamp } from '@domain/types/shared'
import { HabitId as mkHabitId, EntryId as mkEntryId, TimestampStr } from '@domain/types/shared'
import { formatDate }            from '@domain/services/DateUtils'

// ─── Real Clock ───────────────────────────────────────────────────────────────

export class RealClock implements IClockService {
  todayAsDateString(): DateString {
    return formatDate(new Date())
  }

  nowAsTimestamp(): Timestamp {
    return TimestampStr(new Date().toISOString())
  }
}

// ─── UUID ID Generator ────────────────────────────────────────────────────────

export class UuidIdGenerator implements IIdGenerator {
  habitId(): HabitId {
    return mkHabitId(crypto.randomUUID())
  }

  entryId(): EntryId {
    return mkEntryId(crypto.randomUUID())
  }
}

// ─── Test fakes (exported for use in unit tests) ──────────────────────────────

export class FakeClock implements IClockService {
  constructor(private fixedDate: string) {}

  todayAsDateString(): DateString {
    return this.fixedDate as DateString
  }

  nowAsTimestamp(): Timestamp {
    return TimestampStr(`${this.fixedDate}T00:00:00.000Z`)
  }

  /** Advance the clock by N days */
  advance(days: number): void {
    const d = new Date(this.fixedDate)
    d.setUTCDate(d.getUTCDate() + days)
    this.fixedDate = formatDate(d)
  }
}

export class SequentialIdGenerator implements IIdGenerator {
  private habitCounter  = 0
  private entryCounter  = 0

  habitId(): HabitId {
    return mkHabitId(`habit-${++this.habitCounter}`)
  }

  entryId(): EntryId {
    return mkEntryId(`entry-${++this.entryCounter}`)
  }
}
