---
id: task-002
title: Domain errors (InvalidTitleError, TodoNotFoundError)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Summary

Define the two domain error types used across all layers.

- `InvalidTitleError` — raised when `TodoTitle` is blank or exceeds 500 characters.
- `TodoNotFoundError` — raised by the Application Layer when a `TodoId` references a non-existent Todo.

Both errors should carry a human-readable message and be distinguishable by type (subclass / named error class).
