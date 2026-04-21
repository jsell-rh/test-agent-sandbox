---
id: task-007
title: SQLite Connection Management
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-006]
round: 0
branch: null
pr: null
---

Implement the SQLite connection factory and lifecycle management.

### Requirements

- Database file path read from `DATABASE_PATH` env var; default `./todos.db` with a logged warning when the var is absent.
- For test environments: `DATABASE_PATH=:memory:` enables an in-memory SQLite instance.
- On connection open, execute:
  ```sql
  PRAGMA journal_mode=WAL;
  PRAGMA busy_timeout=5000;
  ```
- On application start, call the migration runner (task-006) synchronously before accepting requests. If the database file is not writable, fail with a clear `DatabaseInitError` (not a silent degradation).
- Expose a single connection (or connection pool, if the chosen driver requires it) as a dependency-injectable singleton.

### Failure modes

| Scenario | Expected Behaviour |
|---|---|
| DB file not writable | Startup fails with `DatabaseInitError` before accepting requests |
| `DATABASE_PATH` missing | Falls back to `./todos.db`; logs a warning |
| Concurrent writes (WAL mode) | Second writer waits up to `busy_timeout`; no corruption |
