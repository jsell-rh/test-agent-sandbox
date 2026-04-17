---
id: task-002
title: Domain Events
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001]
round: 0
branch: null
pr: null
---

## Scope

Implement all Domain Events emitted by the `Todo` Aggregate. Events are immutable records;
they carry no behaviour.

### Events to implement

```
TodoCreated   { todoId: TodoId, title: TodoTitle, occurredAt: Timestamp }
TodoCompleted { todoId: TodoId, occurredAt: Timestamp }
TodoReopened  { todoId: TodoId, occurredAt: Timestamp }
TodoTitleUpdated { todoId: TodoId, newTitle: TodoTitle, occurredAt: Timestamp }
TodoDeleted   { todoId: TodoId, occurredAt: Timestamp }
```

### Constraints

- All event fields are immutable after construction.
- Field names match the Ubiquitous Language exactly.
- Events carry value-object types (not raw primitives) so domain invariants are preserved.

### TDD: Required test cases (write tests first)

- Each event can be constructed with the required fields.
- Attempting to mutate an event field after construction raises an error (or is rejected by type system).
- Event field types match their Value Object counterparts (TodoId, TodoTitle, Timestamp).
