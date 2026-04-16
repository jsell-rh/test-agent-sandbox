---
id: task-004
title: SQLite database connection management and configuration
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Scope

Set up the database connection layer for SQLite, including configuration, pragmas, and test-environment support.

### Requirements

- Read `DATABASE_PATH` environment variable to determine SQLite file path; default to `./todos.db` if unset; log a warning when falling back to default.
- Support `:memory:` as a `DATABASE_PATH` value for fully isolated in-memory test databases.
- On connection open, execute:
  - `PRAGMA journal_mode=WAL;` — enables Write-Ahead Logging for durability
  - `PRAGMA busy_timeout=5000;` — 5-second wait before failing on write contention
- Expose a single, reusable connection object consumed by the migration runner (task-005) and repository implementation (task-006).
- On unwritable database file at startup, fail with a clear `DatabaseInitError` before accepting any requests.

### Non-Functional Requirements (from spec)

| Concern | Requirement |
|---|---|
| Durability | WAL mode ensures committed writes survive process crash |
| Test isolation | Each test suite uses a fresh in-memory database (`DATABASE_PATH=:memory:`) |
| Error clarity | `DatabaseInitError` on init failure, not a generic unhandled exception |
