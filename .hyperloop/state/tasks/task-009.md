---
id: task-009
title: Application Layer Use Cases
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-004, task-005]
round: 0
branch: null
pr: null
---

Implement the Application Layer use cases that coordinate HTTP intent with the `Todo` Aggregate. No business rules here — those live in the Aggregate. Receives a `TodoRepository` via dependency injection.

### Use cases to implement

**ListTodos(filter: FilterCriteria)**
- Calls `repository.findAll(filter)` and `repository.counts()`
- Returns `{ todos: Todo[], counts: { all, active, completed } }`

**GetTodo(id: TodoId)**
- Calls `repository.findById(id)`
- Throws `TodoNotFoundError` if result is `null`

**CreateTodo(title: string)**
- Constructs `TodoTitle` (raises `InvalidTitleError` if invalid)
- Calls `Todo.create(title)`, then `repository.save(todo)`
- Returns the created `Todo`

**UpdateTodo(id: TodoId, patch: { title?: string, status?: 'active' | 'completed' })**
- Calls `repository.findById(id)` → throws `TodoNotFoundError` if null
- If `title` present: calls `todo.updateTitle(new TodoTitle(title))`
- If `status === 'completed'`: calls `todo.complete()`
- If `status === 'active'`: calls `todo.reopen()`
- If `status` is any other value: throws `BadRequestError`
- Calls `repository.save(todo)`
- Returns the updated `Todo`

**DeleteTodo(id: TodoId)**
- Calls `repository.findById(id)` → throws `TodoNotFoundError` if null
- Calls `todo.delete()`, then `repository.delete(id)`

**ClearCompleted()**
- Calls `repository.findAll(FilterCriteria.completed)`
- For each: calls `todo.delete()`, then `repository.delete(todo.id)`
- Returns `{ deletedCount: number }`

All use cases are tested with a mock/stub repository (no real SQLite in these tests).
