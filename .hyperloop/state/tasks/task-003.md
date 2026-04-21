---
id: task-003
title: Domain Errors
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

Implement the two Domain Errors as typed error classes using the exact Ubiquitous Language names:

- `InvalidTitleError` — raised when `TodoTitle` is blank or exceeds 500 characters
- `TodoNotFoundError` — raised when a `TodoId` references a non-existent Todo

Both must be distinguishable from generic errors (e.g. extend a base `DomainError`, carry an error code or type discriminant). The `InvalidTitleError` should include the offending value in its message.
