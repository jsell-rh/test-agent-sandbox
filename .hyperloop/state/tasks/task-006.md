---
id: task-006
title: SQLite schema and migration system
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-004, task-005]
round: 0
branch: null
pr: null
---

Implement the versioned SQL migration system and initial schema using strict TDD (tests first).

**Schema to create (`001_create_todos.sql`):**
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

**Migration tracking table:**
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER NOT NULL PRIMARY KEY,
  applied_at TEXT    NOT NULL
);
```

**Migration system requirements:**
- Plain SQL files, applied in ascending version order
- On application start, check for unapplied migrations and run them (blocking, before accepting requests)
- Re-running migrations must be idempotent — no errors, no duplicate tables
- Startup fails with `DatabaseInitError` if database file is not writable

**Connection management:**
- SQLite file path from `DATABASE_PATH` env var (default `./todos.db`; warn + log if env var missing)
- Enable WAL mode: `PRAGMA journal_mode=WAL;`
- Set busy timeout: `PRAGMA busy_timeout=5000;`
- Tests use `DATABASE_PATH=:memory:` — each suite gets a fresh in-memory database

**Critical test cases:**
- Fresh database: migrations result in valid schema
- Migrations are idempotent (no error on second run)
- Startup fails with `DatabaseInitError` when database is not writable
