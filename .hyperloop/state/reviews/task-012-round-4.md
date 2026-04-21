---
task_id: task-012
round: 4
role: verifier
verdict: fail
---
## Front-matter (verbatim from task-012.md)

```
---
id: task-012
title: PATCH /api/todos/:id endpoint
spec_ref: specs/interface.spec.md@83f71c8105542fd0e91599d89f191c28862ee3ca
status: in-progress
phase: implementer
deps:
- task-008
- task-009
round: 4
branch: hyperloop/task-012
pr: https://github.com/jsell-rh/test-agent-sandbox/pull/33
---
```

## Infra check

```
$ bash .hyperloop/checks/check-infra.sh 2>&1; echo "EXIT_CODE: $?"
OK: directory exists: /home/jsell/code/scratch/test-repo/worktrees/workers/task-012/.hyperloop
OK: directory exists: /home/jsell/code/scratch/test-repo/worktrees/workers/task-012/.hyperloop/state
OK: directory exists: /home/jsell/code/scratch/test-repo/worktrees/workers/task-012/.hyperloop/state/tasks
OK: script present and executable: /home/jsell/code/scratch/test-repo/worktrees/workers/task-012/.hyperloop/checks/check-deps.sh
OK: tool available: bash
OK: tool available: awk
OK: tool available: grep
OK: All infrastructure checks passed.
EXIT_CODE: 0
```

## Dep-gate check

```
$ TASK_ID=task-012 bash .hyperloop/checks/check-deps.sh 2>&1; echo "EXIT_CODE: $?"
OK: task-008 is done
OK: task-009 is done
All dependencies satisfied for task-012.
EXIT_CODE: 0
```

## check-task-meta.sh

```
$ TASK_ID=task-012 bash .hyperloop/checks/check-task-meta.sh 2>&1; echo "EXIT_CODE: $?"
Task metadata for task-012:
  id:     task-012
  title:  PATCH /api/todos/:id endpoint
  status: in-progress
  phase:  implementer
  round:  4
  deps:
  task-008
  task-009
EXIT_CODE: 0
```

## check-timer-tests.sh

```
$ bash .hyperloop/checks/check-timer-tests.sh 2>&1; echo "EXIT_CODE: $?"
Production files using setTimeout/setInterval:
  app/stores/todos.ts

ERROR: Production code uses setTimeout/setInterval but no test file calls vi.useFakeTimers().
Add a fake-timer test (vi.useFakeTimers() + vi.advanceTimersByTime()) that verifies each
scheduled callback fires at the correct time.
EXIT_CODE: 1
```

**check-timer-tests.sh exits 1 — this is a hard finding.**

## Test suite

`nuxt prepare` is required before running tests (generates `.nuxt/tsconfig.json`).

```
$ npx nuxt prepare 2>&1; echo "EXIT_CODE: $?"
[warnings omitted — duplicated useAppConfig imports, non-fatal]
◆  Types generated in .nuxt.
EXIT_CODE: 0

$ npm run test 2>&1; echo "EXIT_CODE: $?"
> test
> vitest run && vitest run --config vitest.infra.config.ts

 RUN  v3.2.4 /home/jsell/code/scratch/test-repo/worktrees/workers/task-012

 ✓ app/stores/todos.spec.ts (42 tests) 17ms
 ✓ app/utils/markdown.spec.ts (31 tests) 34ms
 ✓ app/components/TodoItem.spec.ts (15 tests) 45ms
 ✓ app/pages/index.spec.ts (26 tests) 156ms

 Test Files  4 passed (4)
      Tests  114 passed (114)
   Start at  15:58:16
   Duration  1.41s

 RUN  v3.2.4 /home/jsell/code/scratch/test-repo/worktrees/workers/task-012

 ✓ server/utils/errors.test.ts (8 tests) 3ms
stderr | server/utils/errorFormatter.test.ts > formatApiError — unknown errors > maps a plain Error to 500 INTERNAL_ERROR
[api] Unhandled error: Error: something went wrong
    at .../server/utils/errorFormatter.test.ts:61:17
    ...
stderr | server/utils/errorFormatter.test.ts > formatApiError — unknown errors > maps a plain string to 500 INTERNAL_ERROR
[api] Unhandled error: unexpected string error

 ✓ server/utils/errorFormatter.test.ts (7 tests) 6ms
 ✓ server/infrastructure/persistence/MigrationRunner.test.ts (9 tests) 12ms
 ✓ server/infrastructure/persistence/SqliteTodoRepository.test.ts (23 tests) 41ms
 ✓ server/api/todos/todos.test.ts (31 tests) 48ms

 Test Files  5 passed (5)
      Tests  78 passed (78)
   Start at  15:58:17
   Duration  464ms

EXIT_CODE: 0
```

Total: **192 tests, all pass** (114 app + 78 infra). The two stderr lines from errorFormatter.test.ts are expected — those tests intentionally exercise the unhandled-error path.

## Commit trailer verification

Implementation commit `8431f1e`:

```
Spec-Ref: specs/interface.spec.md@83f71c8105542fd0e91599d89f191c28862ee3ca
Task-Ref: task-012
```

Both required trailers are present. ✓

## Findings

### FINDING-1 (test gap — blocker): Missing fake-timer test for auto-dismiss error behaviour

**Script**: `check-timer-tests.sh` exits 1.

**Location**: `app/stores/todos.ts` line 86.

```typescript
// Auto-dismiss after 5 s (spec: "auto-dismiss after 5s").
setTimeout(() => this.dismissError(id), 5_000)
```

**Spec requirement** (`interface.spec.md` → Non-Functional Requirements):
> Error display: API errors surfaced to user as non-blocking inline messages; auto-dismiss after 5s

No test in `app/stores/todos.spec.ts` or any other file calls `vi.useFakeTimers()` or `vi.advanceTimersByTime()` to verify that `dismissError` is called after 5 000 ms. The behaviour is therefore untested.

**Required fix**: Add a test (in `app/stores/todos.spec.ts`) that:

1. Calls `vi.useFakeTimers()` before the action under test.
2. Triggers an API error so `addError` fires and the `setTimeout` is scheduled.
3. Calls `vi.advanceTimersByTime(5_000)`.
4. Asserts `store.errors` is empty (i.e., `dismissError` ran).
5. Cleans up with `vi.useRealTimers()`.

## Summary

The PATCH endpoint implementation and all 192 tests are correct and spec-compliant. The merge conflict from the previous round has been properly resolved. The single blocker is the absence of a fake-timer test for the 5-second auto-dismiss error behaviour required by the spec and flagged by `check-timer-tests.sh`.