---
id: task-007
title: Schema migrations (runner + 001_create_todos.sql)
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-006]
round: 0
branch: null
pr: null
---

## Scope

Implement the migration runner and the initial migration that creates the `todos` table and indexes.

### schema_migrations table

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER NOT NULL PRIMARY KEY,
  applied_at  TEXT    NOT NULL
);
```

### Migration 001_create_todos.sql

```sql
CREATE TABLE todos (
  id          TEXT NOT NULL PRIMARY KEY,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX idx_todos_status ON todos (status);
CREATE INDEX idx_todos_created_at ON todos (created_at DESC);
```

### Runner Behaviour

- On application start (before accepting requests), the runner checks `schema_migrations` for unapplied versions and runs them in order
- This step is synchronous and blocking
- Already-applied migrations are skipped without error (idempotent)

## Test Cases (write tests first)

- Applying migrations on a fresh database results in valid schema (tables and indexes exist)
- Re-running the migration runner on an already-migrated database is a no-op (no errors, no duplicate tables)
- `schema_migrations` contains a row for version 1 after initial apply
