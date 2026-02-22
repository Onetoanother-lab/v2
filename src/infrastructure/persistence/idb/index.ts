/**
 * INFRASTRUCTURE — IndexedDB module public API
 *
 * Import from this barrel inside container.ts.
 * Internal details (IDBClient, schema, migrations) stay encapsulated.
 */

export { idbClient }                        from './IDBClient'
export { IDBHabitRepository }               from './IDBHabitRepository'
export { IDBEntryRepository }               from './IDBEntryRepository'
export { migrateLocalStorageToIDB }         from './IDBMigrationFromLocalStorage'
export { DB_NAME, DB_VERSION, STORES }      from './IDBSchema'
