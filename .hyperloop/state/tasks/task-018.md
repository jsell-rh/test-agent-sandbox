---
id: task-018
title: Error display — inline messages with auto-dismiss
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-012]
round: 0
branch: null
pr: null
---

## Summary

Implement the UI error notification system: inline, non-blocking error messages that auto-dismiss after 5 seconds.

## Scope

- A global (or page-level) notification area that can receive error messages from any component or API call
- Messages are non-blocking — the rest of the UI remains interactive while an error is shown
- Each error auto-dismisses after 5 seconds
- Multiple errors can queue (or coexist); each has its own 5-second timer
- Error messages are surfaced from API failures (400, 404, 422, 500) and network errors

**Error scenarios to handle** (from spec):
- API returns 500 on create → input not cleared; error message displayed; UI state unchanged
- API returns 500 on toggle → checkbox reverts (optimistic rollback in task-017); error shown
- Network offline → pending actions show error; previously loaded list remains visible

## Notes

- The visual design should be clean and unobtrusive (e.g., toast/snackbar style).
- This component is consumed by the state machine implemented in task-017.
- Does not block user interaction.
