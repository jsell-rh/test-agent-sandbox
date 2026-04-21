---
id: task-006
title: Schema migration 001 — todos table
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-005]
round: 0
branch: null
pr: null
---

## Summary

Write the initial SQL migration file that creates the `todos` table and its indexes.

## Scope

**File**: `migrations/001_create_todos.sql`

**Schema**:
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

## Notes

- `id`: UUID v4 stored as TEXT
- `title`: max 500 chars enforced by domain before write; TEXT stores any length as safety net
- `status`: CHECK constraint is a database-level safety net; primary validation is in the Aggregate
- `created_at` / `updated_at`: ISO 8601 UTC strings stored as TEXT for SQLite portability
- No soft-delete column; deletion is hard delete
- No foreign keys (single-aggregate schema)
- `idx_todos_status` supports `WHERE status = ?` filtered queries
- `idx_todos_created_at` supports `ORDER BY created_at DESC` list ordering
