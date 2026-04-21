---
task_id: task-005
round: 0
role: implementer
verdict: pass
---

## Summary

Implemented the complete SQLite persistence layer as specified in `specs/persistence.spec.md`, layered on top of the existing Nuxt 4 scaffold.

### Domain Layer (`server/domain/`)

Created the full domain model that the persistence layer depends on:

| File | Purpose |
|---|---|
| `server/domain/Todo.ts` | Aggregate Root with `create()` factory (emits events) and `reconstitute()` factory (no events — for storage loading) |
| `server/domain/TodoRepository.ts` | Domain-owned interface with `findById`, `findAll(filter?)`, `save`, `delete`, `counts()` |
| `server/domain/value-objects/TodoTitle.ts` | Validated title (non-blank, ≤500 chars) |
| `server/domain/value-objects/TodoStatus.ts` | Enum: `active` \| `completed` |
| `server/domain/value-objects/FilterCriteria.ts` | Enum: `all` \| `active` \| `completed` |
| `server/domain/value-objects/Timestamp.ts` | ISO 8601 UTC timestamp value object |
| `server/domain/events/` | 5 domain events: TodoCreated, TodoCompleted, TodoReopened, TodoTitleUpdated, TodoDeleted |
| `server/domain/errors/` | InvalidTitleError, TodoNotFoundError |
| `server/domain/index.ts` | Barrel export for the entire domain |

### Infrastructure Layer (`server/infrastructure/`)

| File | Purpose |
|---|---|
| `server/infrastructure/persistence/DatabaseConnection.ts` | Opens SQLite with WAL mode + 5 s busy timeout; reads `DATABASE_PATH` env var (falls back to `./todos.db`, logs warning) |
| `server/infrastructure/persistence/MigrationRunner.ts` | Versioned SQL migration runner; creates `schema_migrations` table; idempotent; runs each migration in a transaction |
| `server/infrastructure/persistence/migrations/001_create_todos.sql` | Creates `todos` table with CHECK constraint + `idx_todos_status` + `idx_todos_created_at` indexes |
| `server/infrastructure/persistence/SqliteTodoRepository.ts` | Full `TodoRepository` implementation: `findById`, `findAll(filter?)`, `save` (upsert), `delete`, `counts()` |
| `server/infrastructure/errors/PersistenceError.ts` | Wraps low-level SQLite errors for the Application Layer |
| `server/infrastructure/errors/DatabaseInitError.ts` | Fatal startup error when DB cannot be opened or migrated |
| `server/infrastructure/index.ts` | Barrel export |

### Server Plugin (`server/plugins/database.ts`)

Nitro plugin that opens the DB connection, runs migrations, and exposes `getDb()` / `getTodoRepository()` helpers for API route handlers.

### Tests (32 tests — all passing)

| File | Tests |
|---|---|
| `server/infrastructure/persistence/MigrationRunner.test.ts` | 9 tests: schema creation, idempotency, CHECK constraint validation |
| `server/infrastructure/persistence/SqliteTodoRepository.test.ts` | 23 tests: findById, findAll (all filters), save (insert + update), delete, counts |

### Test Infrastructure

- Added `vitest.infra.config.ts` — plain Node.js vitest config for server-side tests (no Nuxt/Vite transform pipeline, supports native `better-sqlite3` bindings).
- Updated `vitest.config.ts` — scoped to `app/**` only to avoid double-running infra tests.
- Added `test:app` and `test:infra` npm scripts alongside the combined `test` script.

### Dependency Changes

| Package | Type | Reason |
|---|---|---|
| `better-sqlite3` ^11 | prod | Synchronous SQLite driver (safe in Nitro handlers) |
| `uuid` ^10 | prod | UUID v4 generation for `Todo.create()` |
| `@types/better-sqlite3` ^7.6 | dev | TypeScript types |
| `@types/uuid` ^10 | dev | TypeScript types |
| `vitest` upgraded to ^3 | dev | Required for Vite 7 compatibility (Nuxt 4.4 ships Vite 7) |
| `happy-dom` ^20 | dev | DOM environment for app-layer tests (implicit Nuxt requirement) |

### Design Decisions

- **`Todo.reconstitute()`** — static factory that calls `new TodoTitle(rawTitle)` to re-validate data integrity but skips event emission, as specified.
- **`all` SQL alias** — `COUNT(*) AS total` used instead of `AS all` because `ALL` is a reserved word in SQLite; mapped back to `all` in the TypeScript return value.
- **`created_at` immutability** — excluded from the `ON CONFLICT DO UPDATE` clause so it can never be overwritten after insert.
- **No ORM** — all SQL is raw, as required by the spec.
- **In-memory test isolation** — every test uses a fresh `openDatabase(':memory:')` database seeded via repository `save()` calls; no shared state or file I/O.
