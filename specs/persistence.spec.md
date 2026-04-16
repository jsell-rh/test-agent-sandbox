# Persistence Spec — TODO Application

Covers: storage schema, repository implementation contract, and infrastructure concerns. References Ubiquitous Language from `domain-model.spec.md`.

---

## Bounded Context: Infrastructure / Persistence

**Responsibility**: Implement the `TodoRepository` interface defined by the Domain. Translate between the Domain's `Todo` Aggregate and the storage representation. Manage connection lifecycle.

**Separation rule**: This context has zero knowledge of HTTP, UI, or Domain business rules. It only maps data.

---

## Storage Choice

**Default target**: SQLite (file-based, zero infrastructure dependency, suitable for a simple TODO application).

**Abstraction**: The Domain's `TodoRepository` interface is the only coupling point. Swapping to PostgreSQL or an in-memory store requires only a new implementation of that interface — no Domain or Application Layer changes.

---

## Schema Definition

### Table: `todos`

```sql
CREATE TABLE todos (
  id          TEXT        NOT NULL PRIMARY KEY,  -- TodoId (UUID v4)
  title       TEXT        NOT NULL,              -- TodoTitle (max 500 chars, validated by domain before write)
  status      TEXT        NOT NULL               -- TodoStatus: 'active' | 'completed'
                CHECK (status IN ('active', 'completed')),
  created_at  TEXT        NOT NULL,              -- Timestamp (ISO 8601 UTC)
  updated_at  TEXT        NOT NULL               -- Timestamp (ISO 8601 UTC)
);
```

**Notes**:
- No foreign keys — this is a single-aggregate schema.
- `CHECK` constraint on `status` is a safety net; primary validation happens in the Aggregate.
- TEXT is used for UUID and timestamps to maintain SQLite portability. No SQLite-specific type affinity dependencies.
- No soft-delete column. `TodoDeleted` means hard delete from this table.

### Indexes

```sql
CREATE INDEX idx_todos_status ON todos (status);
CREATE INDEX idx_todos_created_at ON todos (created_at DESC);
```

`idx_todos_status` supports filtered queries (`WHERE status = ?`).
`idx_todos_created_at` supports list ordering (newest first).

---

## Mapping: Domain <-> Persistence

### Domain -> Row (write)

```
Todo.id.value        -> id
Todo.title.value     -> title
Todo.status          -> status
Todo.createdAt.value -> created_at
Todo.updatedAt.value -> updated_at
```

### Row -> Domain (read / reconstitution)

```
id         -> TodoId(row.id)
title      -> TodoTitle(row.title)   // re-validates on reconstitution
status     -> TodoStatus(row.status)
created_at -> Timestamp(row.created_at)
updated_at -> Timestamp(row.updated_at)
```

Reconstitution calls a private `Todo.reconstitute()` factory (distinct from `Todo.create()`) to bypass event emission — loading from storage does not re-emit `TodoCreated`.

---

## Repository Implementation Contract

Implements `TodoRepository` from the Domain.

### findById(id: TodoId): Todo | null

```sql
SELECT * FROM todos WHERE id = ?;
```

Returns null (not an error) when no row found. The Application Layer is responsible for converting null -> `TodoNotFoundError`.

### findAll(filter?: FilterCriteria): Todo[]

```sql
-- filter = 'all' (or omitted)
SELECT * FROM todos ORDER BY created_at DESC;

-- filter = 'active'
SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC;

-- filter = 'completed'
SELECT * FROM todos WHERE status = 'completed' ORDER BY created_at DESC;
```

### save(todo: Todo): void

Upsert behaviour (insert or replace):

```sql
INSERT INTO todos (id, title, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title      = excluded.title,
  status     = excluded.status,
  updated_at = excluded.updated_at;
```

`created_at` is never overwritten on update (excluded from the DO UPDATE clause).

### delete(id: TodoId): void

```sql
DELETE FROM todos WHERE id = ?;
```

No error if the row does not exist (the Application Layer has already validated existence via `findById` before calling `delete`).

### counts(): { all: number, active: number, completed: number }

```sql
SELECT
  COUNT(*)                                    AS all,
  SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
FROM todos;
```

Used by `GET /api/todos` to populate the `counts` field without a second query.

---

## Migration Strategy

### Versioned migrations

Migrations are plain SQL files, applied in order, tracked via a `schema_migrations` table:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER NOT NULL PRIMARY KEY,
  applied_at  TEXT    NOT NULL
);
```

Initial migration (`001_create_todos.sql`) creates the `todos` table and indexes.

### Startup behaviour

On application start, the repository checks for unapplied migrations and runs them before accepting requests. This is a synchronous blocking step.

---

## Connection Management

- Single SQLite file path configurable via environment variable `DATABASE_PATH` (default: `./todos.db`).
- WAL (Write-Ahead Logging) mode enabled at connection open: `PRAGMA journal_mode=WAL;`
- Busy timeout set to 5000ms: `PRAGMA busy_timeout=5000;`
- For test environments: in-memory SQLite (`":memory:"`) used via `DATABASE_PATH=:memory:`.

---

## Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Durability | WAL mode ensures committed writes survive process crash |
| Performance | All list queries complete in < 10ms for up to 10,000 todos |
| Test isolation | Each test suite uses a fresh in-memory database seeded via repository `save()` calls |
| No ORM | Raw SQL only; no ORM abstraction layer between repository and database |

---

## TDD Plan

### Critical Test Cases

**TodoRepository.findById()**
- Returns a fully reconstituted `Todo` with all fields matching saved values
- Returns null for an unknown `TodoId`
- Reconstituted Todo does not emit any Domain Events

**TodoRepository.findAll()**
- Returns todos ordered by `createdAt` descending
- `filter: 'active'` excludes completed todos
- `filter: 'completed'` excludes active todos
- `filter: 'all'` returns both active and completed todos
- Returns empty array when no todos exist

**TodoRepository.save()** (insert)
- Persisted todo can be retrieved via `findById()`
- `createdAt` and `updatedAt` are identical on first save

**TodoRepository.save()** (update)
- Updating title: `findById()` returns new title
- Updating status: `findById()` returns new status
- `createdAt` is unchanged after update
- `updatedAt` is later than `createdAt` after update

**TodoRepository.delete()**
- Deleted todo is not returned by `findById()` or `findAll()`
- Calling delete on non-existent id does not throw

**TodoRepository.counts()**
- Returns `{ all: 0, active: 0, completed: 0 }` on empty store
- Correctly counts after mixed inserts

**Schema migrations**
- Applying migrations on a fresh database results in valid schema
- Re-running migrations is idempotent (no errors, no duplicate tables)

### Failure Modes

| Scenario | Expected Behaviour |
|---|---|
| Database file not writable | Startup fails with clear `DatabaseInitError` before accepting requests |
| `save()` called with corrupted `TodoId` | SQLite CHECK constraint raises; propagates as `PersistenceError` |
| Concurrent writes (WAL mode) | Second writer waits up to busy_timeout; no corruption |
| `DATABASE_PATH` env var missing | Falls back to `./todos.db`; logs a warning |
