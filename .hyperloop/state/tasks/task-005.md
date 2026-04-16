---
id: task-005
title: SQLite schema definition and versioned migration runner
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-004]
round: 0
branch: null
pr: null
---

## Scope

Define the `todos` table schema, indexes, and implement a versioned migration runner that executes on startup.

### Schema

```sql
CREATE TABLE todos (
  id          TEXT  NOT NULL PRIMARY KEY,
  title       TEXT  NOT NULL,
  status      TEXT  NOT NULL CHECK (status IN ('active', 'completed')),
  created_at  TEXT  NOT NULL,
  updated_at  TEXT  NOT NULL
);

CREATE INDEX idx_todos_status ON todos (status);
CREATE INDEX idx_todos_created_at ON todos (created_at DESC);
```

### Migration Tracking Table

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER NOT NULL PRIMARY KEY,
  applied_at TEXT    NOT NULL
);
```

### Migration Runner

- Plain SQL files named `001_create_todos.sql`, `002_...sql`, etc. applied in version order.
- On startup, runner checks `schema_migrations` for applied versions and runs only unapplied ones.
- This is a synchronous blocking step — the application does not accept requests until migrations complete.
- Re-running migrations is idempotent: no errors, no duplicate tables.

### Critical Test Cases (from spec)

- Applying migrations on a fresh database results in a valid schema
- Re-running migrations is idempotent (no errors, no duplicate tables)

### Notes

- `CHECK (status IN ('active', 'completed'))` is a safety net; primary validation happens in the Aggregate.
- No soft-delete column — `TodoDeleted` means a hard `DELETE` from the table.
- TEXT type for UUIDs and timestamps to maintain SQLite portability.
