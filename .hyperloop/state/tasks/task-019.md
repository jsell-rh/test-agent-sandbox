---
id: task-019
title: Optimistic UI updates and error handling with auto-dismiss
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-015, task-016, task-017]
round: 0
branch: null
pr: null
---

## Scope

Implement optimistic updates for toggle and delete actions, rollback on failure, and the non-blocking inline error display system.

### Optimistic Update Behaviour

**Toggle (checkbox)**:
1. Immediately update `todo.status` in `todos[]` (optimistic)
2. Send `PATCH /api/todos/:id { status: toggled }`
3. On success: update with server response (canonical)
4. On failure: revert `todo.status` to original value (rollback)

**Delete**:
1. Immediately remove todo from `todos[]` (optimistic)
2. Send `DELETE /api/todos/:id`
3. On success: nothing (already removed)
4. On failure: reinsert todo at its original position (rollback)

### Error Display

**Component: `ErrorToast.vue`** (or inline error area)
- Non-blocking: does not prevent other interactions
- Displayed inline near the action that triggered the error
- Auto-dismisses after 5 seconds
- Can be manually dismissed by the user
- Accessible: announced to screen readers via `aria-live`

### Failure Scenarios

| Scenario | Expected Behaviour |
|---|---|
| API 500 on create | Input not cleared; error shown; `todos[]` unchanged |
| API 500 on toggle | Checkbox reverts to pre-toggle state |
| API 500 on delete | Todo reinserted into list; error shown |
| Network offline | Error shown; previously loaded list remains visible |

## Test Cases (write tests first)

- Toggle: local state updates immediately before API responds
- Toggle rollback: on 500, `todo.status` reverts to original
- Delete: todo removed from list immediately
- Delete rollback: on 500, todo reappears at original position
- Error toast appears on API failure; disappears after 5 seconds
- Error toast dismissed manually before 5 seconds
- `aria-live` region updated when error appears
