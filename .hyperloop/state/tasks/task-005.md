---
id: task-005
title: SQLite connection management and migration runner
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Summary

Implement SQLite database connection management and the migration runner that applies versioned SQL migrations at startup.

## Scope

**Connection management**:
- Read `DATABASE_PATH` env var; default to `./todos.db`; log a warning when env var is missing
- Enable WAL mode: `PRAGMA journal_mode=WAL;`
- Set busy timeout: `PRAGMA busy_timeout=5000;`
- Support `DATABASE_PATH=:memory:` for test environments

**Migration runner**:
- Create `schema_migrations` table if it does not exist:
  ```sql
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER NOT NULL PRIMARY KEY,
    applied_at  TEXT    NOT NULL
  );
  ```
- Scan migration files in order; apply any not yet recorded in `schema_migrations`
- Startup behaviour: blocking step; application does not accept requests until migrations complete
- On failure (e.g., database file not writable): raise `DatabaseInitError` with a clear message

## TDD Test Cases (from spec)

- Applying migrations on a fresh database results in valid schema
- Re-running migrations is idempotent (no errors, no duplicate tables)
- `DATABASE_PATH` env var missing → falls back to `./todos.db` and logs a warning
- Database file not writable → raises `DatabaseInitError` before accepting requests
