---
task_id: task-017
round: 0
role: implementer
verdict: pass
---

## Summary

Implemented TDD test coverage for **Filter bar, footer counts, and Clear completed button** as specified in `specs/interface.spec.md`.

### What was done

The implementation of the filter bar, footer counts, and "Clear completed" button already existed in the codebase (carried forward from prior tasks via the orchestrator cycle), but the corresponding tests were absent. This task adds comprehensive test coverage for all specified behaviours.

#### New test files

**`app/stores/todos.spec.ts`** — 42 tests covering the Pinia store:
- Initial state verification (todos, counts, filterCriteria, loading, errors)
- `filteredTodos` getter: returns all / only active / only completed / empty set based on `filterCriteria`, without modifying the underlying `todos[]` array (confirms client-side filtering — no network request)
- `hasAnyTodos` getter: footer visibility control
- `hasCompletedTodos` getter: "Clear completed" button visibility control
- `setFilter` action: updates filterCriteria correctly for all three values
- `prependTodo` action: list ordering + count management for active and completed
- `updateTodoInList` action: count adjustment on status change (active→completed, completed→active, no change when status unchanged), no-op on unknown id
- `removeTodo` action: removal + count decrement for both statuses, no-op on unknown id
- `removeCompletedTodos` action: bulk removal + count reset, no-op when nothing completed, full empty case
- Edit mode actions: `startEditing`, `stopEditing`
- Error management: `addError`, `dismissError`

**`app/pages/index.spec.ts`** — 23 tests covering the page component:
- Footer visibility: hidden with no todos, visible with at least one
- `{N} item(s) left` display: 0/1/plural forms, live update after store mutation
- "Clear completed" button: hidden when `completedCount === 0`, visible when `completedCount > 0`, appears after toggle, click invokes `clearCompleted`
- Filter tabs: "All" shows all, "Active" shows only active, "Completed" shows only completed, switching tabs does NOT call `loadTodos` (no extra network request)
- Filter tab active state: `aria-current="page"` and `--active` CSS class on selected tab
- Empty state: contextual messages for `all`, `active`, `completed` filter states
- New-todo input: Enter creates, Escape clears without creating, whitespace-only does nothing
- Initial data loading: `loadTodos` called on mount

### Test counts

| Suite | Tests | Result |
|---|---|---|
| `app/stores/todos.spec.ts` | 42 | ✅ pass |
| `app/pages/index.spec.ts` | 23 | ✅ pass |
| `app/components/TodoItem.spec.ts` | 15 | ✅ pass (pre-existing) |
| `app/utils/markdown.spec.ts` | 13 | ✅ pass (pre-existing) |
| `server/**` (infra) | 78 | ✅ pass (pre-existing) |
| **Total** | **171** | **✅ all pass** |

### Spec compliance

All critical test cases from `specs/interface.spec.md` TDD Plan are covered:

| Spec requirement | Covered by |
|---|---|
| "Clear completed" button only visible when `completedCount > 0` | `todos.spec.ts > hasCompletedTodos getter`, `index.spec.ts > "Clear completed" button visibility` |
| `{N} item(s) left` reflects current active count after toggling | `todos.spec.ts > updateTodoInList action`, `index.spec.ts > "{N} item(s) left" active count` |
| Filter tabs correctly show/hide items without an additional network request | `todos.spec.ts > filteredTodos getter`, `index.spec.ts > filter tabs — switching tabs does NOT call loadTodos` |
