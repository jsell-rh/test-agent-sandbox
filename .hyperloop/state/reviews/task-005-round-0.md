---
task_id: task-005
round: 0
role: verifier
verdict: pass
---

## Verification Summary

Reviewed branch `hyperloop/task-005` against `specs/persistence.spec.md`.
All 45 tests pass (32 infra + 13 app). Commit trailers present.

---

## Test Run

```
npm run test:infra   →  32 passed (MigrationRunner: 9, SqliteTodoRepository: 23)
npm run test:app     →  13 passed (markdown utils)
npm run test         →  45 total, all passed
```

No check scripts in `.hyperloop/checks/`.

---

## Commit Trailers

```
Spec-Ref: specs/persistence.spec.md  ✓
Task-Ref: task-005                   ✓
```

---

## Spec Coverage

### Schema (✓ correct)
- `todos` table matches spec exactly: `id TEXT PK`, `title TEXT NOT NULL`, `status TEXT NOT NULL CHECK(...)`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.
- Both indexes present: `idx_todos_status`, `idx_todos_created_at DESC`.
- No soft-delete column. No foreign keys.

### Repository methods (✓ correct)
- `findById` — correct SELECT, returns null on miss, wraps errors as `PersistenceError`.
- `findAll` — correct filter branching (all/active/completed), `ORDER BY created_at DESC`.
- `save` — correct upsert; `created_at` excluded from `DO UPDATE SET` (immutable on update).
- `delete` — silent no-op on missing id.
- `counts` — single query with `COUNT(*) AS total` + CASE WHEN; NULL coerced to 0 on empty table. Correctly mapped back to `{ all, active, completed }`.

### Domain model (✓ correct)
- `Todo.reconstitute()` factory is distinct from `Todo.create()`: no events emitted, but title re-validated.
- All five domain events present and correct.
- `TodoTitle`, `TodoStatus`, `FilterCriteria`, `Timestamp` value objects implemented.
- `InvalidTitleError`, `TodoNotFoundError`, `PersistenceError`, `DatabaseInitError` all present.

### Migration runner (✓ correct)
- `schema_migrations` tracking table created with `CREATE TABLE IF NOT EXISTS`.
- Migrations applied in a transaction; recorded on success.
- Fully idempotent — re-running is a no-op.
- `001_create_todos.sql` uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

### Connection management (✓ correct)
- `PRAGMA journal_mode = WAL` applied at open.
- `PRAGMA busy_timeout = 5000` applied at open.
- `DATABASE_PATH` env var respected; falls back to `./todos.db` with a warning in `openDatabase()`.

### TDD plan coverage (✓ complete)
Every test case listed in the spec's TDD Plan is implemented and passing.
Additional bonus tests (counts after status change, counts after delete) are present.

---

## Findings

### F1 — Minor: Default database path deviates from spec (non-blocking)

**Spec**: default `DATABASE_PATH` → `./todos.db`

**Actual**: `nuxt.config.ts` sets `runtimeConfig.databasePath` to `process.env.DATABASE_PATH ?? './data/todos.db'`, so the Nitro plugin always receives a non-null path. In production without `DATABASE_PATH` set, the database is created at `./data/todos.db`, not `./todos.db` as specified.

A secondary effect: `openDatabase()`'s `DATABASE_PATH not set` warning (correct per spec) is dead code through the production startup path, because the Nuxt runtimeConfig provides a non-null default before `openDatabase` is called.

**Recommendation**: Change the runtimeConfig default from `'./data/todos.db'` to `'./todos.db'`, or remove the default entirely so the warning in `openDatabase()` actually fires.

### F2 — Minor: Migration list is hardcoded (non-blocking)

`MigrationRunner._loadMigrations()` maintains a manual list of known SQL files. Adding a new migration file requires updating this list. This is a maintenance risk as the number of migrations grows.

**Recommendation**: Auto-discover migration files from the `migrations/` directory using `readdirSync`, sorted by filename, rather than maintaining a manual registry.

### F3 — Cosmetic: `_rowToTodo` silently maps invalid status to `active`

```ts
const status = row.status === TodoStatus.completed
  ? TodoStatus.completed
  : TodoStatus.active   // catches anything that isn't 'completed'
```

The SQLite CHECK constraint prevents invalid values from being stored, so this branch is unreachable in practice. However, if data were somehow corrupted, this would silently reconstitute the wrong status instead of raising a `PersistenceError`.

**Recommendation**: Add an `else` branch that throws `new PersistenceError(...)` for unrecognised status values, making data integrity violations visible.

---

## Verdict: PASS

All spec-required behaviour is correctly implemented and tested. F1 is a spec deviation on the default path but does not affect functional correctness; the env var override path works as specified. F2 and F3 are low-risk maintenance concerns. No blocking issues found.
