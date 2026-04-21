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

Implement all Value Objects and Domain Errors from the domain model spec using strict TDD (tests first).

**Value Objects to implement:**
- `TodoId` — UUID v4 string, immutable, equality by value
- `TodoTitle` — non-empty string max 500 chars, trimmed, raises `InvalidTitleError` if blank or too long, equality by value
- `TodoStatus` — enumeration `active | completed`
- `FilterCriteria` — enumeration `all | active | completed`, default `all`
- `Timestamp` — ISO 8601 UTC string, immutable, equality by value

**Domain Errors to implement:**
- `InvalidTitleError` — raised when `TodoTitle` is blank or exceeds 500 characters
- `TodoNotFoundError` — raised when a `TodoId` references a non-existent Todo

**Critical test cases (must be covered):**
- Blank string raises `InvalidTitleError`
- Whitespace-only string raises `InvalidTitleError`
- 500-character string is valid
- 501-character string raises `InvalidTitleError`
- Leading/trailing whitespace is trimmed before validation
