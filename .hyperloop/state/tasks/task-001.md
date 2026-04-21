---
id: task-001
title: Domain value objects and errors
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Summary

Implement all domain Value Objects and Domain Errors using strict TDD.

## Scope

**Value Objects** (each immutable, equality by value):
- `TodoId` — UUID v4 string wrapper
- `TodoTitle` — non-empty string, max 500 chars, trimmed; raises `InvalidTitleError` on violation
- `TodoStatus` — enumeration `active | completed`
- `FilterCriteria` — enumeration `all | active | completed`, default `all`
- `Timestamp` — ISO 8601 UTC string wrapper

**Domain Errors**:
- `InvalidTitleError` — raised when `TodoTitle` is blank or exceeds 500 characters
- `TodoNotFoundError` — raised when a `TodoId` references a non-existent Todo

## TDD Test Cases (from spec)

**TodoTitle**
- Blank string raises `InvalidTitleError`
- Whitespace-only string raises `InvalidTitleError`
- 500-character string is valid
- 501-character string raises `InvalidTitleError`
- Leading/trailing whitespace is trimmed before validation
