---
id: task-007
title: SQLite connection management
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-006]
round: 0
branch: null
pr: null
---

## Summary

Implement the SQLite connection factory/manager.

- Read `DATABASE_PATH` env var; default to `./todos.db`; log a warning if env var is absent.
- On connect, execute:
  - `PRAGMA journal_mode=WAL;`
  - `PRAGMA busy_timeout=5000;`
- Run migration runner (task-006) as a blocking startup step before accepting any requests.
- Test environments use `DATABASE_PATH=:memory:` for an isolated in-memory database.
- If the database file is not writable, raise `DatabaseInitError` before the server starts.
