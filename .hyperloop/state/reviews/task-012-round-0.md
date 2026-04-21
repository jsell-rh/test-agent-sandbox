---
task_id: task-012
round: 0
role: verifier
verdict: fail
---

## Verifier Review — task-012

### Summary

The implementation **does not satisfy task-012**. The implementer built a Nuxt 4
enterprise documentation/marketing platform that matches `specs/user-interface.spec.md`
(a one-line spec: "UI should be Nuxt 4. Clean, and enterprise. Full markdown support."),
but task-012 is defined in `task-012.md` with `spec_ref: specs/interface.spec.md` and
requires **New Todo input and Todo list components** built via TDD.

---

### Findings

#### 1. Wrong task implemented (CRITICAL)

`task-012.md` requires:
- A `NewTodoInput` component (Enter → POST /api/todos, Escape → clear, inline error on 422)
- A `TodoList` container (ordered by `createdAt` desc, client-side filter from `filterCriteria`,
  empty-state messages)

What was delivered:
- `app/pages/index.vue` — enterprise landing page (hero, stats bar, feature grid, CTA)
- `app/components/AppNavbar.vue` — sticky nav with dark-mode toggle
- `app/layouts/default.vue` — docs sidebar layout
- `app/pages/docs/[...slug].vue` — markdown docs renderer
- `content/docs/getting-started.md` — sample markdown content

Neither `NewTodoInput` nor `TodoList` exist anywhere in the repository.

#### 2. Wrong spec referenced in commits (CRITICAL)

Every commit on this branch carries:
```
Spec-Ref: specs/user-interface.spec.md
```

Task-012's authoritative spec reference is `specs/interface.spec.md`. The
`specs/user-interface.spec.md` file currently contains only one line and
describes an entirely different deliverable. The commit trailers are misleading
and do not match the task definition.

#### 3. No tests whatsoever (CRITICAL)

`task-012.md` explicitly mandates TDD with component tests covering:
- Enter creates item prepended to list
- Escape clears input without creating
- Filter `active` hides completed items (no extra network request)
- Filter `completed` hides active items (no extra network request)
- Empty-state message when filtered list is empty
- API error on create: input not cleared, error shown, `todos[]` unchanged

`package.json` has no test script. There are zero `*.test.*` or `*.spec.*` files
in the repository (excluding `.hyperloop/` and spec documents). The TDD requirement
is completely unmet.

#### 4. Prerequisite task-011 is not-started (BLOCKER)

`task-012.md` declares `deps: [task-011]`. Task-011 provides the Pinia store
(`todos[]`, `filterCriteria`, `editingTodoId`) and the typed API client that
`NewTodoInput` and `TodoList` depend on. That task is `status: not-started`.
Building task-012 without task-011 means there is no store foundation for the
components to integrate with.

#### 5. No Pinia store integration

Even setting aside task-011, the implemented code has no Pinia dependency
(`pinia`, `@pinia/nuxt`) in `package.json`. The `TodoList` container is
required to derive its visible items from `todos[]` filtered by `filterCriteria`
from the store — impossible without Pinia in place.

---

### Checks Executed

| Check | Result |
|---|---|
| `.hyperloop/checks/` scripts | No check scripts found — N/A |
| `NewTodoInput` component present | ❌ ABSENT |
| `TodoList` container present | ❌ ABSENT |
| Component test files present | ❌ ABSENT |
| `Spec-Ref` matches task-012.md `spec_ref` | ❌ Mismatch (`user-interface.spec.md` vs `interface.spec.md`) |
| `Task-Ref: task-012` present | ✅ Present |
| Nuxt 4 build passes | ✅ Passes (but wrong deliverable) |

---

### Required Actions for Re-submission

1. Ensure task-011 is merged before re-attempting task-012 (dependency gate).
2. Implement `app/components/NewTodoInput.vue` per the spec:
   - Text input, placeholder "What needs to be done?"
   - Enter → `POST /api/todos`; prepend result to store's `todos[]`; clear input on success
   - Escape → clear input, no API call
   - 422 response → do NOT clear input; display inline error message
3. Implement `app/components/TodoList.vue` per the spec:
   - Ordered list of `TodoItem` components sorted by `createdAt` descending
   - Client-side filter: derive visible list from `todos[]` filtered by store's `filterCriteria`
   - Empty-state slot with contextual messages ("No active tasks" / "Nothing completed yet")
4. Write component tests (Vitest + `@nuxt/test-utils` or equivalent) for all six
   critical test cases listed in `task-012.md`.
5. Set `Spec-Ref: specs/interface.spec.md` in all new commits.
