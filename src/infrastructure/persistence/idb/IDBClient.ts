/**
 * INFRASTRUCTURE — IndexedDB Client (low-level wrapper)
 *
 * Wraps the raw IndexedDB API in Promises and handles:
 *   • Database opening and upgrade lifecycle
 *   • Promisified request helpers (idbGet, idbPut, idbDelete, idbGetAll, idbCursor)
 *   • Transaction factory with automatic error propagation
 *   • Version-gated migration execution
 *   • Connection error handling and retry guard
 *
 * This is the ONLY file in the codebase that touches `indexedDB.*` directly.
 * All repositories go through this client — they never open IDB themselves.
 *
 * Design decisions:
 *   • Single shared IDBDatabase instance (opened once, reused for lifetime)
 *   • `ready` Promise resolves when the DB is open and all migrations ran
 *   • Lightweight — no external dependency on idb/dexie/etc.
 */

import { DB_NAME, DB_VERSION } from './IDBSchema'
import { runMigrations }       from './IDBMigrations'

// ─── Core client ─────────────────────────────────────────────────────────────

export class IDBClient {
  /** Resolves when the connection is ready for use */
  readonly ready: Promise<void>

  private db: IDBDatabase | null = null

  constructor() {
    this.ready = this.open()
  }

  // ─── Open & upgrade ────────────────────────────────────────────────────────

  private open(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!('indexedDB' in globalThis)) {
        reject(new Error('[IDBClient] IndexedDB is not available in this environment.'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db  = (event.target as IDBOpenDBRequest).result
        const tx  = (event.target as IDBOpenDBRequest).transaction!
        const old = event.oldVersion   // 0 on fresh install

        try {
          runMigrations(db, tx, old, DB_VERSION)
        } catch (migrationError) {
          // Abort the upgrade transaction — IDB will reject the open request
          tx.abort()
          reject(migrationError)
        }
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result

        // Log version mismatch warnings (should never happen if DB_VERSION is bumped)
        this.db.onversionchange = () => {
          this.db?.close()
          console.warn(
            '[IDBClient] DB version changed by another tab — connection closed. Reload to reconnect.',
          )
        }

        console.info(`[IDBClient] Connected to "${DB_NAME}" v${DB_VERSION}`)
        resolve()
      }

      request.onerror = (event) => {
        reject(
          new Error(
            `[IDBClient] Failed to open database: ${(event.target as IDBOpenDBRequest).error?.message}`,
          ),
        )
      }

      request.onblocked = () => {
        console.warn(
          '[IDBClient] DB upgrade blocked — another tab has the database open. Close other tabs and reload.',
        )
      }
    })
  }

  // ─── Internal DB accessor (throws if not ready) ────────────────────────────

  private getDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('[IDBClient] Database not ready — await client.ready before calling methods.')
    }
    return this.db
  }

  // ─── Transaction factory ───────────────────────────────────────────────────

  /**
   * Create a typed transaction over one or more stores.
   * Returns the transaction object — callers open object stores on it.
   */
  transaction(
    storeNames: string | string[],
    mode: IDBTransactionMode = 'readonly',
  ): IDBTransaction {
    return this.getDB().transaction(storeNames, mode)
  }

  /**
   * Run an async operation inside a readwrite transaction that auto-commits.
   * If the callback throws, the transaction is aborted and the error re-thrown.
   */
  async readwrite<T>(
    storeNames: string | string[],
    operation: (tx: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const tx = this.getDB().transaction(storeNames, 'readwrite')

      let result: T

      tx.oncomplete = () => resolve(result)
      tx.onerror    = () => reject(tx.error)
      tx.onabort    = () => reject(new Error('[IDBClient] Transaction aborted'))

      // We run the async operation but capture any thrown errors to abort the tx
      operation(tx)
        .then((r) => { result = r })
        .catch((e) => {
          tx.abort()
          reject(e)
        })
    })
  }

  // ─── Promisified IDB request helpers ──────────────────────────────────────

  /** Wrap any IDBRequest in a Promise */
  static request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror   = () => reject(req.error)
    })
  }

  /** GET a single record by primary key from a store */
  static get<T>(store: IDBObjectStore | IDBIndex, key: IDBValidKey): Promise<T | undefined> {
    return IDBClient.request<T>(store.get(key) as IDBRequest<T>)
  }

  /** PUT (upsert) a record into a store */
  static put<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
    return IDBClient.request(store.put(value))
  }

  /** DELETE a record by primary key */
  static delete(store: IDBObjectStore, key: IDBValidKey): Promise<undefined> {
    return IDBClient.request(store.delete(key))
  }

  /** GET ALL records from a store or index, optionally filtered by key range */
  static getAll<T>(
    storeOrIndex: IDBObjectStore | IDBIndex,
    query?: IDBKeyRange | IDBValidKey,
  ): Promise<T[]> {
    return IDBClient.request<T[]>(
      (storeOrIndex.getAll as (query?: IDBKeyRange | IDBValidKey) => IDBRequest<T[]>)(query),
    )
  }

  /**
   * COUNT records in a store or index, optionally within a key range.
   * Used for existsByName and hasEntryForDate checks.
   */
  static count(
    storeOrIndex: IDBObjectStore | IDBIndex,
    query?: IDBKeyRange | IDBValidKey,
  ): Promise<number> {
    return IDBClient.request(
      (storeOrIndex.count as (query?: IDBKeyRange | IDBValidKey) => IDBRequest<number>)(query),
    )
  }

  /**
   * Iterate all records matching a key range using a cursor.
   * Used for bulk-delete operations (deleteAllEntriesForHabit).
   */
  static async cursorDelete(
    storeOrIndex: IDBObjectStore | IDBIndex,
    query: IDBKeyRange,
  ): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      let deleted = 0
      const req = storeOrIndex.openCursor(query)

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
        if (!cursor) {
          resolve(deleted)
          return
        }
        cursor.delete()
        deleted++
        cursor.continue()
      }

      req.onerror = () => reject(req.error)
    })
  }

  // ─── Utility: close connection ─────────────────────────────────────────────

  close(): void {
    this.db?.close()
    this.db = null
    console.info('[IDBClient] Connection closed.')
  }
}

// ─── Module-level singleton ────────────────────────────────────────────────────

/**
 * Shared IDBClient instance for the application lifetime.
 * Import this in repositories — do not create new IDBClient instances.
 *
 * Awaiting `idbClient.ready` is mandatory before any store operation.
 * The container calls `await idbClient.ready` once at startup so that
 * by the time any use case runs, the DB is guaranteed open.
 */
export const idbClient = new IDBClient()
