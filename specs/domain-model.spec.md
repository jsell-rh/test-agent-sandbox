# Domain Model Spec — TODO Application

## Strategic Design

### Bounded Context: Todo Management

**Responsibility**: Manage the lifecycle of Todo items — creation, state transitions, and deletion. Enforces all business rules about what a valid Todo is and what state changes are permissible.

**Out of scope for this context**: rendering, filtering presentation, HTTP transport, persistence mechanics.

---

### Ubiquitous Language

These terms MUST be used verbatim in code (class names, method names, variable names, event names).

| Term | Definition |
|---|---|
| `Todo` | A unit of work tracked by the user. The Aggregate Root of this context. |
| `TodoId` | A stable, globally-unique identifier assigned at creation. Immutable. |
| `TodoTitle` | The human-readable description of the work to be done. A non-empty string. |
| `TodoStatus` | The current lifecycle state of a Todo: `active` or `completed`. |
| `FilterCriteria` | A Value Object representing the view selection: `all`, `active`, or `completed`. |
| `TodoCreated` | Domain Event emitted when a new Todo is persisted. |
| `TodoCompleted` | Domain Event emitted when a Todo transitions to `completed`. |
| `TodoReopened` | Domain Event emitted when a Todo transitions back to `active`. |
| `TodoTitleUpdated` | Domain Event emitted when a Todo's title is changed. |
| `TodoDeleted` | Domain Event emitted when a Todo is permanently removed. |
| `complete()` | The command method that marks a Todo as `completed`. |
| `reopen()` | The command method that marks a `completed` Todo back to `active`. |

---

### Aggregates

#### Todo (Aggregate Root)

**Consistency boundary**: A single Todo. No cross-aggregate transactions.

**Identity**: `TodoId`

**State**:

```
Todo {
  id:        TodoId        // immutable after creation
  title:     TodoTitle     // mutable via updateTitle()
  status:    TodoStatus    // transitions via complete() / reopen()
  createdAt: Timestamp     // immutable after creation
  updatedAt: Timestamp     // updated on every mutation
}
```

**Invariants** (must be enforced inside the Aggregate, not in a Service):

1. `TodoTitle` must not be blank (empty or whitespace-only).
2. `TodoTitle` must not exceed 500 characters.
3. Calling `complete()` on an already-`completed` Todo is a no-op (idempotent, no event emitted).
4. Calling `reopen()` on an already-`active` Todo is a no-op (idempotent, no event emitted).
5. A `Todo` cannot be created without a `TodoTitle`.

**Factory method**: `Todo.create(title: TodoTitle): Todo` — validates invariants, assigns a new `TodoId`, sets `status` to `active`, emits `TodoCreated`.

**Command methods**:

- `todo.complete() -> TodoCompleted | void`
- `todo.reopen() -> TodoReopened | void`
- `todo.updateTitle(newTitle: TodoTitle) -> TodoTitleUpdated`
- `todo.delete() -> TodoDeleted` (marks intent; actual removal is delegated to the repository)

---

### Value Objects

#### TodoId

- Type: UUID v4 string
- Immutable
- Equality: by value, not reference
- Generated at creation time by the factory method

#### TodoTitle

- Type: non-empty string, max 500 characters, trimmed
- Immutable (replacing a title produces a new `TodoTitle`)
- Equality: by value (case-sensitive)
- Validation: raises `InvalidTitleError` if blank or exceeds max length

#### TodoStatus

- Enumeration: `active | completed`
- No additional behaviour; transitions enforced by `Todo` Aggregate

#### FilterCriteria

- Enumeration: `all | active | completed`
- Used by Application Layer only — never on the Aggregate itself
- Default value: `all`

#### Timestamp

- Type: ISO 8601 UTC datetime string
- Immutable once set
- Equality: by value

---

### Domain Events

All events are immutable records emitted by the Aggregate after a state change is applied.

```
TodoCreated {
  todoId:    TodoId
  title:     TodoTitle
  occurredAt: Timestamp
}

TodoCompleted {
  todoId:     TodoId
  occurredAt: Timestamp
}

TodoReopened {
  todoId:     TodoId
  occurredAt: Timestamp
}

TodoTitleUpdated {
  todoId:     TodoId
  newTitle:   TodoTitle
  occurredAt: Timestamp
}

TodoDeleted {
  todoId:     TodoId
  occurredAt: Timestamp
}
```

---

### Domain Errors

| Error | Trigger |
|---|---|
| `InvalidTitleError` | `TodoTitle` is blank or exceeds 500 characters |
| `TodoNotFoundError` | A `TodoId` references a non-existent Todo |

---

### Domain Services

There are intentionally no Domain Services in this context. All business logic lives inside the `Todo` Aggregate. An Anemic Domain Model (logic in Services, dumb entities) is explicitly rejected.

---

### Repository Interface (Domain-owned, not Infrastructure)

The domain defines the contract. Infrastructure implements it.

```
interface TodoRepository {
  findById(id: TodoId): Todo | null
  findAll(): Todo[]
  save(todo: Todo): void       // insert or update
  delete(id: TodoId): void
}
```

---

## TDD Plan

### Critical Test Cases

**TodoTitle**
- Blank string raises `InvalidTitleError`
- Whitespace-only string raises `InvalidTitleError`
- 500-character string is valid
- 501-character string raises `InvalidTitleError`
- Leading/trailing whitespace is trimmed before validation

**Todo.create()**
- Returns a Todo with `status: active`
- Assigns a non-null `TodoId`
- Emits exactly one `TodoCreated` event
- Raises `InvalidTitleError` when title is invalid

**todo.complete()**
- Transitions `active` -> `completed`, emits `TodoCompleted`
- Calling on already-`completed` Todo: no state change, no event emitted

**todo.reopen()**
- Transitions `completed` -> `active`, emits `TodoReopened`
- Calling on already-`active` Todo: no state change, no event emitted

**todo.updateTitle()**
- Updates `title`, emits `TodoTitleUpdated`
- Raises `InvalidTitleError` when new title is invalid

### Failure Modes

| Scenario | Expected Behaviour |
|---|---|
| Create with empty title | `InvalidTitleError` thrown before any persistence |
| Update to whitespace title | `InvalidTitleError` thrown; original title unchanged |
| Complete an already-completed Todo | Idempotent no-op; no duplicate event |
| Delete a non-existent TodoId | `TodoNotFoundError` thrown by Repository |
