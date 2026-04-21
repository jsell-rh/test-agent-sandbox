---
task_id: task-019
round: 0
role: verifier
verdict: fail
---
## Task Front-Matter (verbatim)

```
---
id: task-019
title: Optimistic UI updates and error handling with auto-dismiss
spec_ref: specs/interface.spec.md@83f71c8105542fd0e91599d89f191c28862ee3ca
status: not-started
phase: null
deps:
- task-015
- task-016
- task-017
round: 0
branch: null
pr: null
---
```

---

## Infra Check

```
$ bash .hyperloop/checks/check-infra.sh
bash: .hyperloop/checks/check-infra.sh: No such file or directory
EXIT_CODE: 127
```

```
$ ls .hyperloop/checks/
check-deps.sh
```

`check-infra.sh` is absent from `.hyperloop/checks/`. Per review protocol, a non-zero exit from `check-infra.sh` is an immediate hard failure. The only file present is `check-deps.sh`.

**Verdict: FAIL — infra check blocker.**

---

## Dep-Gate Check

```
$ TASK_ID=task-019 bash .hyperloop/checks/check-deps.sh
OK: task-015 is done
OK: task-016 is done
OK: task-017 is done
All dependencies satisfied for task-019.
EXIT_CODE: 0
```

All dependencies satisfied. ✓

---

## Test Suite

Required `nuxi prepare` first (`.nuxt/tsconfig.json` was absent in the worktree):

```
$ npx nuxi prepare
Types generated in .nuxt.
EXIT: 0

$ npm test

> test
> vitest run && vitest run --config vitest.infra.config.ts

 ✓ app/stores/todos.spec.ts (42 tests) 17ms
 ✓ app/composables/useTodoActions.spec.ts (35 tests) 26ms
 ✓ app/utils/markdown.spec.ts (31 tests) 38ms
 ✓ app/components/TodoItem.spec.ts (15 tests) 74ms
 ✓ app/pages/index.spec.ts (33 tests) 195ms

 Test Files  5 passed (5)
      Tests  156 passed (156)
   Start at  15:43:16
   Duration  1.50s

 ✓ server/utils/errors.test.ts (8 tests)
 ✓ server/utils/errorFormatter.test.ts (7 tests)
 ✓ server/infrastructure/persistence/MigrationRunner.test.ts (9 tests)
 ✓ server/infrastructure/persistence/SqliteTodoRepository.test.ts (23 tests)
 ✓ server/api/todos/todos.test.ts (31 tests)

 Test Files  5 passed (5)
      Tests  78 passed (78)
   Duration  448ms
```

All 234 tests pass (156 app + 78 infra). ✓

---

## Commit Trailers

```
Spec-Ref: specs/interface.spec.md@83f71c8105542fd0e91599d89f191c28862ee3ca
Task-Ref: task-019
```

Both trailers present. `Spec-Ref` matches `spec_ref` in task front-matter exactly. ✓

---

## Diff Review

Branch `hyperloop/task-019` contains one implementation commit:

```
b2a237e test(task-019): optimistic UI updates and error handling with auto-dismiss
```

Files changed:
- `app/composables/useTodoActions.spec.ts` — new, 589 lines, 35 tests
- `app/pages/index.spec.ts` — +99 lines, 7 new tests (33 total)
- `.hyperloop/state/reviews/task-019-round-0.md` — implementer self-review (overwritten by this verifier file)

### Positives

1. All four spec failure modes explicitly tested and tagged in comments:
   - "API returns 500 on create" → `createTodo` returns false, error surfaced, store unchanged
   - "API returns 500 on toggle" → optimistic rollback verified
   - "Network offline" → existing list preserved after failed `loadTodos`
   - "Duplicate rapid toggles" → final server state wins (race condition test using held promises)

2. Mock strategy is sound: `useApi` is mocked via `importActual` spread so `ApiClientError instanceof` checks in `useTodoActions` continue to work against the real class. ✓

3. Rollback tests use a held-promise pattern to verify optimistic state before the API resolves — correct approach. ✓

4. `index.spec.ts` additions cover input-not-cleared behaviour and toast rendering including ARIA `role="alert"`. ✓

---

## Findings

### BLOCKER-1 — `check-infra.sh` missing (immediate protocol failure)

`.hyperloop/checks/` contains only `check-deps.sh`. `check-infra.sh` does not exist.
Per review protocol:

> Infra check first: Run `bash .hyperloop/checks/check-infra.sh` as the very first action; if it exits non-zero the checks infrastructure is broken — fail the review immediately and flag every missing/non-executable script.

Exit code: 127. The review must fail.

**Action required:** Create `.hyperloop/checks/check-infra.sh` as an executable script that validates the checks infrastructure (at minimum: confirm `check-deps.sh` exists and is executable). The script must exit 0 on a healthy infrastructure.

---

### FINDING-1 — No test for the 5-second auto-dismiss timer

The task title is *"…with auto-dismiss"*. The spec NFR table states:

> Error display | API errors surfaced to user as non-blocking inline messages; **auto-dismiss after 5s**

The implementation correctly schedules a timer:

```ts
// app/stores/todos.ts lines 85-86
// Auto-dismiss after 5 s (spec: "auto-dismiss after 5s").
setTimeout(() => this.dismissError(id), 5_000)
```

Neither the new `useTodoActions.spec.ts` nor the updated `index.spec.ts` verify that this timer fires. The existing `todos.spec.ts` tests cover `dismissError` (the manual dismiss API) and `addError` (adds an error), but the 5-second countdown is never asserted with a fake timer.

**Action required:** Add a timer test in `app/stores/todos.spec.ts`:

```ts
it('auto-dismisses an error toast after 5 seconds', () => {
  vi.useFakeTimers()
  const store = useTodosStore()
  store.addError('INTERNAL_ERROR', 'Transient error')
  expect(store.errors).toHaveLength(1)
  vi.advanceTimersByTime(5_000)
  expect(store.errors).toHaveLength(0)
  vi.useRealTimers()
})
```

---

## Summary

| Check | Result |
|---|---|
| `check-infra.sh` | FAIL (exit 127 — script missing) |
| `check-deps.sh` | PASS |
| Test suite (234 tests) | PASS |
| Commit trailers | PASS |
| All 4 spec failure modes covered | PASS |
| Auto-dismiss timer tested | MISSING |

Two action items required before this task can pass:

1. **Create** `.hyperloop/checks/check-infra.sh` (executable, exits 0 on healthy infra).
2. **Add** a fake-timer test verifying the 5-second auto-dismiss in `app/stores/todos.spec.ts`.