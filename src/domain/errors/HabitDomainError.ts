/**
 * DOMAIN LAYER — Domain Error Hierarchy
 *
 * OCP principle: new error codes are added here without modifying callers.
 * Every error carries a machine-readable `code` so the presentation layer
 * can map it to a user-friendly message without string parsing.
 */

import { DomainError } from '@domain/types/shared'

export type HabitErrorCode =
  // Validation
  | 'INVALID_NAME'
  | 'INVALID_CATEGORY'
  | 'INVALID_COLOR'
  | 'INVALID_CUSTOM_DAYS'
  | 'INVALID_TARGET'
  // State
  | 'ALREADY_ARCHIVED'
  | 'NOT_FOUND'
  | 'DUPLICATE_ENTRY'
  | 'ENTRY_NOT_FOUND'
  // Scheduling
  | 'NOT_SCHEDULED_TODAY'
  | 'FUTURE_DATE'

export class HabitDomainError extends DomainError {
  constructor(
    public override readonly code: HabitErrorCode,
    message: string,
  ) {
    super(code, message)
    this.name = 'HabitDomainError'
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /** True when the error is safe to surface directly to the end-user */
  get isUserFacing(): boolean {
    return [
      'INVALID_NAME',
      'INVALID_CATEGORY',
      'INVALID_COLOR',
      'INVALID_CUSTOM_DAYS',
      'INVALID_TARGET',
      'ALREADY_ARCHIVED',
      'DUPLICATE_ENTRY',
      'NOT_SCHEDULED_TODAY',
      'FUTURE_DATE',
    ].includes(this.code)
  }
}
