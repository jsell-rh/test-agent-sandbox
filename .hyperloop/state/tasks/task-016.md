---
id: task-016
title: Optimistic UI updates and error display
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-014, task-015]
round: 0
branch: null
pr: null
---

Implement optimistic UI updates for toggle and delete, and the global non-blocking error display, using TDD.

**Optimistic updates:**
- **Toggle (checkbox)**: immediately update the todo's status in `todos[]` before the API call resolves; if the API call fails, revert the status to its previous value
- **Delete**: immediately remove the todo from `todos[]`; if the API call fails, re-insert the todo at its original position

**Error display:**
- API errors (any 4xx/5xx) are surfaced as non-blocking inline messages (e.g. a toast / notification bar)
- Messages auto-dismiss after 5 seconds
- Multiple errors can be queued; each dismisses independently
- Error messages do not block user interaction
- When offline: pending actions show an error; previously loaded `todos[]` remains visible and usable

**Critical test cases:**
- Checkbox click immediately updates status in store (before API resolves)
- API error on toggle: status reverts to previous value; error message shown
- Delete click immediately removes item from store
- API error on delete: item restored to original position; error message shown
- Error message auto-dismisses after 5 seconds
- Error message can be manually dismissed
- Duplicate rapid toggles: second request supersedes first; final server state wins
