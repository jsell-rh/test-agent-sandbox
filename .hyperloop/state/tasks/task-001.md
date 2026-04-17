---
id: task-001
title: Domain Value Objects and Domain Errors
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Scope

Implement all Value Objects and Domain Errors defined in the Domain Model spec.

### Value Objects to implement

- `TodoId` — UUID v4 string; immutable; equality by value.
- `TodoTitle` — non-empty string, max 500 chars, trimmed; immutable; raises `InvalidTitleError` on invalid input.
- `TodoStatus` — enumeration `active | completed`; no additional behaviour.
- `FilterCriteria` — enumeration `all | active | completed`; default `all`.
- `Timestamp` — ISO 8601 UTC string; immutable; equality by value.

### Domain Errors to implement

- `InvalidTitleError` — raised when `TodoTitle` is blank or exceeds 500 characters.
- `TodoNotFoundError` — raised when a `TodoId` references a non-existent Todo.

### TDD: Required test cases (write tests first)

**TodoTitle**
- Blank string raises `InvalidTitleError`
- Whitespace-only string raises `InvalidTitleError`
- 500-character string is valid
- 501-character string raises `InvalidTitleError`
- Leading/trailing whitespace is trimmed before validation
- Equality: two `TodoTitle` instances with the same value are equal

**TodoId**
- Two `TodoId` instances with the same value are equal
- Generated IDs are UUID v4 format

**TodoStatus / FilterCriteria**
- Only enumerated values are accepted; invalid values raise an error
