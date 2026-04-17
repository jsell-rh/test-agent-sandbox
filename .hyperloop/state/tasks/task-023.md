---
id: task-023
title: Optimistic UI updates (toggle and delete with rollback on error)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-018, task-020]
round: 0
branch: null
pr: null
---

## Summary

Implement optimistic updates for the two most latency-sensitive interactions.

**Toggle (checkbox)**:
1. Immediately update `todos[]` with the new status (optimistic).
2. Call `PATCH /api/todos/:id { status }`.
3. On success: no further action (state already updated).
4. On error (e.g. 500): revert `todos[]` to the previous status; show error message.

**Delete (delete button)**:
1. Immediately remove from `todos[]` (optimistic).
2. Call `DELETE /api/todos/:id`.
3. On success: no further action.
4. On error: re-insert todo at original position; show error message.

**Duplicate rapid toggles**: second request supersedes first; final server state wins (use request cancellation or sequencing).

## TDD Cases

- API error on toggle: checkbox reverts to previous state.
- API error on delete: item reappears in list.
