---
id: task-006
title: Database schema and versioned migrations
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-005]
round: 0
branch: null
pr: null
---

## Summary

Create the SQL migration infrastructure and initial schema.

**`schema_migrations` table** (tracks applied versions):
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER NOT NULL PRIMARY KEY,
  applied_at TEXT    NOT NULL
);
```

**Migration `001_create_todos.sql`**:
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

**Migration runner**: on startup, check `schema_migrations`, apply any unapplied files in version order. Re-running migrations must be idempotent.

## TDD Cases

- Applying migrations on a fresh database produces valid schema.
- Re-running migrations raises no error and creates no duplicate tables.
