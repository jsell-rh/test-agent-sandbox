---
id: task-006
title: SQLite database connection and configuration
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-005]
round: 0
branch: null
pr: null
---

## Scope

Implement the database connection module used by the repository. No schema, no queries — just the connection lifecycle.

### Behaviour

- Read `DATABASE_PATH` from environment; fall back to `./todos.db` and log a warning when unset
- Open SQLite connection with:
  - `PRAGMA journal_mode=WAL;`
  - `PRAGMA busy_timeout=5000;`
- Expose a `getDb()` function (or singleton) that returns the configured connection
- For test environments (`DATABASE_PATH=:memory:`): return an in-memory database
- If the database file path is not writable, throw `DatabaseInitError` before the application accepts requests

### Error Types

- `DatabaseInitError` — wraps the underlying OS/SQLite error with a human-readable message

## Test Cases (write tests first)

- `getDb()` returns a connection with WAL mode active (query `PRAGMA journal_mode` → `wal`)
- `getDb()` with `DATABASE_PATH=:memory:` returns an in-memory connection
- Missing `DATABASE_PATH` falls back to `./todos.db` and does not throw
- Unwritable path throws `DatabaseInitError`
