---
task_id: task-012
round: 1
role: implementer
verdict: fail
---
## Blocker: Dependency task-011 is not done

### Dependency gate check

Task-012 declares `deps: [task-011]`.

Opening `.hyperloop/state/tasks/task-011.md` reveals:

```
status: not-started
```

Per protocol, **no implementation code may be written** until every declared dependency is `status: done`. Task-011 (`UI app shell, API client, and state store`) provides the foundational Pinia store (`todos[]`, `filterCriteria`, `editingTodoId`) and the typed API client that `NewTodoInput` and `TodoList` require. Implementing task-012 without this foundation is not possible.

### What would be implemented (once unblocked)

Spec `specs/interface.spec.md` defines the following deliverables for task-012:

**`app/components/NewTodoInput.vue`**
- Text input, placeholder "What needs to be done?"
- Enter → `POST /api/todos`; on 201: prepend result to store's `todos[]`, clear input
- Escape → clear input, no API call
- 422 → do NOT clear input; display inline error message

**`app/components/TodoList.vue`**
- Ordered list of `TodoItem` components sorted by `createdAt` descending
- Derives visible list from store's `todos[]` filtered by `filterCriteria` (client-side, no extra network request)
- Empty-state slot: contextual messages ("No active tasks" / "Nothing completed yet")

**Component tests (Vitest + `@nuxt/test-utils`)**
All six critical cases from the task file:
1. Enter creates item prepended to list
2. Escape clears input without creating
3. Filter `active` hides completed items (no extra network request)
4. Filter `completed` hides active items (no extra network request)
5. Empty-state message shown when filtered list is empty
6. API error on create: input not cleared, error shown, `todos[]` unchanged

### Action required

Merge/complete task-011 first, then re-trigger task-012.