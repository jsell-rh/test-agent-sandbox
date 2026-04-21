---
id: task-001
title: Domain Value Objects
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

Implement all Value Objects from the domain model using TDD (tests first):

- `TodoId` — UUID v4 string, immutable, equality by value
- `TodoTitle` — non-empty string max 500 chars, trimmed, raises `InvalidTitleError` on violation
- `TodoStatus` — enumeration `active | completed`
- `FilterCriteria` — enumeration `all | active | completed`, default `all`
- `Timestamp` — ISO 8601 UTC string, immutable, equality by value

### Critical test cases (write before implementation)

**TodoTitle**
- Blank string raises `InvalidTitleError`
- Whitespace-only string raises `InvalidTitleError`
- 500-character string is valid
- 501-character string raises `InvalidTitleError`
- Leading/trailing whitespace is trimmed before validation

Use the exact Ubiquitous Language term names as class/type names in code.
