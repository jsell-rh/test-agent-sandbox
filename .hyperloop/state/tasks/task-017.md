---
id: task-017
title: API client composable (typed wrappers for all REST endpoints)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-016, task-010, task-011, task-012, task-013, task-014, task-015]
round: 0
branch: null
pr: null
---

## Summary

Implement a `useTodoApi` composable (or equivalent) in the Nuxt 4 frontend that wraps all REST endpoints with typed request/response shapes.

Functions to expose:
- `listTodos(filter?: FilterCriteria)` → `{ todos, counts }`
- `createTodo(title: string)` → `Todo`
- `getTodo(id: string)` → `Todo`
- `updateTodo(id: string, patch: { title?: string; status?: TodoStatus })` → `Todo`
- `deleteTodo(id: string)` → `void`
- `clearCompleted()` → `{ deletedCount: number }`

All functions should propagate API errors (typed by `error` code) so callers can handle them.
