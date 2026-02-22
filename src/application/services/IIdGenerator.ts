/**
 * APPLICATION LAYER — ID Generator Interface
 *
 * Defines the contract for ID generation.
 * The application layer depends on this abstraction, not on crypto.randomUUID().
 * The infrastructure layer provides the concrete implementation.
 *
 * This makes use cases 100% testable with predictable IDs.
 */

import type { HabitId, EntryId } from '@domain/types/shared'

export interface IIdGenerator {
  habitId(): HabitId
  entryId(): EntryId
}
