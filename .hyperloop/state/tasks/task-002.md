---
id: task-002
title: Domain events
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001]
round: 0
branch: null
pr: null
---

Implement all Domain Events as immutable records using strict TDD (tests first).

**Events to implement (all fields immutable, emitted after state change is applied):**

```
TodoCreated   { todoId: TodoId, title: TodoTitle, occurredAt: Timestamp }
TodoCompleted { todoId: TodoId, occurredAt: Timestamp }
TodoReopened  { todoId: TodoId, occurredAt: Timestamp }
TodoTitleUpdated { todoId: TodoId, newTitle: TodoTitle, occurredAt: Timestamp }
TodoDeleted   { todoId: TodoId, occurredAt: Timestamp }
```

**Requirements:**
- Events are immutable once constructed
- All field names must match the Ubiquitous Language exactly
- Events carry only the data needed to describe what happened — no behaviour
