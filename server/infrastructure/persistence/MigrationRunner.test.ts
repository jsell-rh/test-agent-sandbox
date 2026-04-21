/**
 * MigrationRunner — TDD test suite.
 *
 * Validates schema migration correctness and idempotency using in-memory SQLite.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { openDatabase } from './DatabaseConnection.js'
import { MigrationRunner } from './MigrationRunner.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Open a fresh in-memory database (no migrations applied). */
function freshDb(): Database.Database {
  return openDatabase(':memory:')
}

/** Return the list of table names in the database. */
function tableNames(db: Database.Database): string[] {
  const rows = db
    .prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
  return rows.map(r => r.name)
}

/** Return the list of index names in the database. */
function indexNames(db: Database.Database): string[] {
  const rows = db
    .prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name",
    )
    .all()
  return rows.map(r => r.name)
}

// ---------------------------------------------------------------------------
// Schema migration tests
// ---------------------------------------------------------------------------

describe('MigrationRunner', () => {
  let db: Database.Database
  let runner: MigrationRunner

  beforeEach(() => {
    db = freshDb()
    runner = new MigrationRunner(db)
  })

  it('creates the schema_migrations tracking table on first run', () => {
    runner.run()
    expect(tableNames(db)).toContain('schema_migrations')
  })

  it('creates the todos table on a fresh database', () => {
    runner.run()
    expect(tableNames(db)).toContain('todos')
  })

  it('creates the expected indexes on the todos table', () => {
    runner.run()
    const indexes = indexNames(db)
    expect(indexes).toContain('idx_todos_status')
    expect(indexes).toContain('idx_todos_created_at')
  })

  it('records applied migration versions in schema_migrations', () => {
    runner.run()

    const rows = db
      .prepare<[], { version: number }>('SELECT version FROM schema_migrations')
      .all()

    expect(rows.map(r => r.version)).toContain(1)
  })

  it('is idempotent — re-running does not throw or duplicate tables', () => {
    runner.run()

    // Run a second time — should be a no-op
    expect(() => runner.run()).not.toThrow()

    // Tables should not be duplicated (still just one of each)
    const names = tableNames(db)
    expect(names.filter(n => n === 'todos')).toHaveLength(1)
    expect(names.filter(n => n === 'schema_migrations')).toHaveLength(1)
  })

  it('is idempotent — re-running does not duplicate migration records', () => {
    runner.run()
    runner.run()

    const rows = db
      .prepare<[], { version: number }>('SELECT version FROM schema_migrations')
      .all()

    // Version 1 should appear exactly once
    expect(rows.filter(r => r.version === 1)).toHaveLength(1)
  })

  it('todos table has the correct columns', () => {
    runner.run()

    const columns = db
      .prepare<[], { name: string }>('PRAGMA table_info(todos)')
      .all()
      .map(c => c.name)

    expect(columns).toContain('id')
    expect(columns).toContain('title')
    expect(columns).toContain('status')
    expect(columns).toContain('created_at')
    expect(columns).toContain('updated_at')
  })

  it('status column enforces CHECK constraint (active | completed)', () => {
    runner.run()

    expect(() => {
      db.prepare(
        "INSERT INTO todos (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run('test-id', 'Test', 'invalid_status', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z')
    }).toThrow()
  })

  it('accepts valid status values', () => {
    runner.run()

    const now = '2025-01-01T00:00:00.000Z'

    expect(() => {
      db.prepare(
        "INSERT INTO todos (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run('id-active', 'Active todo', 'active', now, now)

      db.prepare(
        "INSERT INTO todos (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run('id-completed', 'Completed todo', 'completed', now, now)
    }).not.toThrow()
  })
})
