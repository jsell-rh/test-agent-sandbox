---
id: task-005
title: Database Connection Management and Schema Migrations
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-004]
round: 0
branch: null
pr: null
---

## Scope

Implement SQLite connection lifecycle and a versioned migration runner. This provides the
infrastructure foundation that the SQLite repository implementation builds on.

### Connection management

- Read `DATABASE_PATH` from environment; default to `./todos.db`; log a warning when env var is absent.
- Enable WAL mode: `PRAGMA journal_mode=WAL;`
- Set busy timeout: `PRAGMA busy_timeout=5000;`
- For test environments: accept `":memory:"` as `DATABASE_PATH` for in-memory SQLite.
- Raise `DatabaseInitError` with a clear message if the database file is not writable.

### Migration runner

- `schema_migrations` table tracks applied versions:
  ```sql
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER NOT NULL PRIMARY KEY,
    applied_at TEXT    NOT NULL
  );
  ```
- Migrations are plain SQL files named `NNN_description.sql` (e.g., `001_create_todos.sql`).
- Runner applies unapplied migrations in version order at startup, before accepting requests.
- Startup is synchronous/blocking until migrations complete.

### Initial migration: `001_create_todos.sql`

```sql
CREATE TABLE todos (
  id         TEXT NOT NULL PRIMARY KEY,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_todos_status ON todos (status);
CREATE INDEX idx_todos_created_at ON todos (created_at DESC);
```

### TDD: Required test cases (write tests first)

- Applying migrations on a fresh database results in a valid schema (todos table + indexes exist).
- Re-running the migration runner is idempotent (no errors, no duplicate tables).
- Missing `DATABASE_PATH` env var falls back to `./todos.db` and logs a warning.
- Non-writable database path raises `DatabaseInitError` before accepting requests.
- In-memory database (`":memory:"`) initialises cleanly.
