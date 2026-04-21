---
id: task-006
title: Database Migration Files
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

Create the versioned SQL migration infrastructure and initial migration.

### schema_migrations tracking table

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

### Migration runner

Implement a migration runner (called at startup) that:
1. Creates `schema_migrations` if it does not exist.
2. Reads all `.sql` files from the migrations directory, sorted by version prefix.
3. Skips versions already recorded in `schema_migrations`.
4. Applies unapplied migrations in order, recording each in `schema_migrations` with `applied_at` timestamp.
5. Is idempotent — running twice on an already-migrated database is a no-op.

### TDD
- Applying migrations on a fresh DB results in valid schema
- Re-running migrations is idempotent (no errors, no duplicate tables)
