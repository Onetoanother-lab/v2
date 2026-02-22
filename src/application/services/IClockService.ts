/**
 * APPLICATION LAYER — Clock Service Interface
 *
 * Abstracting "now" makes every use case that cares about the current time
 * fully deterministic in tests — just inject a FakeClock with a fixed date.
 *
 * DIP: use cases import IClockService; infrastructure provides RealClock.
 */

import type { DateString, Timestamp } from '@domain/types/shared'

export interface IClockService {
  /** Current UTC date as YYYY-MM-DD */
  todayAsDateString(): DateString

  /** Current moment as ISO-8601 timestamp */
  nowAsTimestamp(): Timestamp
}
