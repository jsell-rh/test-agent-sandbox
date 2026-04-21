---
task_id: task-016
round: 1
role: implementer
verdict: pass
---

## Summary

Resolved rebase conflict with main and delivered the complete UI test suite for `app/pages/index.vue`, covering all critical test cases from `specs/interface.spec.md § UI — Critical Test Cases`.

### What was done

**Rebase conflict resolution**: The previous round (round-0) failed because of a merge conflict on `app/pages/index.spec.ts`. Main had landed a new version of the file using `vi.mock('~/composables/useTodoActions', ...)` while our branch used `vi.stubGlobal('$fetch', ...)`. The conflict was resolved by:

1. Taking main's cleaner `vi.mock` approach as the base (deterministic, no async races with onMounted).
2. Adding the edit mode tests from our branch, adapted to the mock pattern.
3. Rebasing successfully onto main, keeping the orchestrator's round-0 fail verdict intact.

### Test suite: `app/pages/index.spec.ts` (26 tests)

| Describe block | Tests | Description |
|---|---|---|
| `footer visibility` | 2 | Footer hidden when no todos; visible when any exist |
| `"{N} item(s) left" active count` | 4 | 0/1/plural display; reactive update on toggle |
| `"Clear completed" button visibility` | 4 | Hidden when 0 completed; visible when >0; dynamic appearance/disappearance |
| `filter tabs — client-side filtering` | 6 | All/Active/Completed views; no loadTodos on tab switch; aria-current; CSS class |
| `empty state message` | 3 | Context-specific messages for all/active/completed filters |
| `new-todo input` | 3 | Enter calls createTodo; Escape clears; whitespace no-op |
| `edit mode` | 3 | Double-click sets editingTodoId; Escape cancels without updateTitle; blank submit calls updateTitle("") |
| `initial data loading` | 1 | loadTodos called on mount |

### Critical test cases covered (from spec)

| Spec requirement | Test |
|---|---|
| Entering title + Enter creates new item at top of list | "pressing Enter with a non-empty title calls createTodo" |
| Pressing Escape in the new-todo input clears without creating | "pressing Escape clears the input without calling createTodo" |
| Double-clicking a title enters edit mode for that item only | "double-clicking a todo label enters edit mode for THAT item only" |
| Pressing Escape in edit mode restores original title | "pressing Escape in edit mode clears editingTodoId without calling updateTitle" |
| Submitting blank title in edit mode deletes the item | "submitting a blank title in edit mode calls updateTitle with empty string (triggers delete)" |
| "Clear completed" only visible when completedCount > 0 | Two tests covering visible/hidden states |
| "{N} item(s) left" reflects active count after toggling | "updates count display when a todo is toggled to completed" |
| Filter tabs show/hide items without additional network request | "switching tabs does NOT call loadTodos (no network request)" |

### Test results

```
✓ app/stores/todos.spec.ts         (42 tests)
✓ app/utils/markdown.spec.ts       (31 tests)
✓ app/components/TodoItem.spec.ts  (15 tests)
✓ app/pages/index.spec.ts          (26 tests)
── App total: 114 tests, 0 failures

✓ server/utils/errors.test.ts                                       (8 tests)
✓ server/utils/errorFormatter.test.ts                               (7 tests)
✓ server/infrastructure/persistence/MigrationRunner.test.ts         (9 tests)
✓ server/infrastructure/persistence/SqliteTodoRepository.test.ts   (23 tests)
✓ server/api/todos/todos.test.ts                                    (31 tests)
── Infra total: 78 tests, 0 failures

Grand total: 192 tests, 0 failures
```
