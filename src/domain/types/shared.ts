/**
 * DOMAIN LAYER — Shared Types, Value Objects & Utilities
 *
 * Branded primitive types prevent accidental mix-ups (e.g. passing a raw
 * string where a HabitId is required).  The `Result<T>` type eliminates
 * thrown exceptions crossing layer boundaries.
 */

// ─── Branded / Nominal types ─────────────────────────────────────────────────

/** Opaque ID wrapper — prevents mixing habit IDs with entry IDs at compile time */
export type HabitId  = string & { readonly __brand: 'HabitId' }
export type EntryId  = string & { readonly __brand: 'EntryId' }

/** YYYY-MM-DD calendar date string */
export type DateString = string & { readonly __brand: 'DateString' }

/** Full ISO-8601 timestamp */
export type Timestamp = string & { readonly __brand: 'Timestamp' }

// ─── Branded constructors ─────────────────────────────────────────────────────

export const HabitId  = (raw: string): HabitId  => raw as HabitId
export const EntryId  = (raw: string): EntryId  => raw as EntryId
export const DateStr  = (raw: string): DateString => raw as DateString
export const TimestampStr = (raw: string): Timestamp => raw as Timestamp

// ─── Result monad ─────────────────────────────────────────────────────────────

export type Result<T, E = DomainError> =
  | { readonly success: true;  readonly data: T }
  | { readonly success: false; readonly error: E }

export type AsyncResult<T, E = DomainError> = Promise<Result<T, E>>

export const ok  = <T>(data: T): Result<T, never>     => ({ success: true,  data })
export const err = <E>(error: E): Result<never, E>    => ({ success: false, error })

/** Unwrap a Result or throw its error — useful in tests */
export function unwrap<T>(result: Result<T>): T {
  if (result.success) return result.data
  throw result.error
}

// ─── Domain error base ────────────────────────────────────────────────────────

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'DomainError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** UI theme — belongs here because it's a cross-cutting concern, not infra */
export type Theme = 'light' | 'dark' | 'system'

