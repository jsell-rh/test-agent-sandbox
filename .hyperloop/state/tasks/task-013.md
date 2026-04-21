---
id: task-013
title: API Client Composable
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-012]
round: 0
branch: null
pr: null
---

Implement a typed API client composable (`useTodoApi`) that wraps all `/api/todos` HTTP calls. This is the single point of contact between the UI and the REST API.

### Methods to expose

```ts
useTodoApi() => {
  listTodos(filter?: 'all' | 'active' | 'completed'): Promise<{ todos: Todo[], counts: Counts }>
  getTodo(id: string): Promise<Todo>
  createTodo(title: string): Promise<Todo>
  updateTodo(id: string, patch: { title?: string; status?: 'active' | 'completed' }): Promise<Todo>
  deleteTodo(id: string): Promise<void>
  clearCompleted(): Promise<{ deletedCount: number }>
}
```

### Requirements

- Use Nuxt's `$fetch` (or `useFetch`) under the hood — no raw `XMLHttpRequest` or third-party HTTP libraries.
- Base URL read from `NUXT_PUBLIC_API_BASE` runtime config.
- All responses are fully typed using the `Todo` type (matching the API resource shape).
- API errors (4xx/5xx) are thrown as typed `ApiError` objects carrying `{ status, error, message }` so callers can handle them specifically.
- No UI state management in this composable — pure HTTP, pure typing.
