---
id: task-019
title: New Todo input component
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-018]
round: 0
branch: null
pr: null
---

## Summary

Implement the **New Todo Input** component.

- Text field with placeholder "What needs to be done?".
- Pressing Enter calls `createTodo(title)` via state composable; clears the field on success.
- Pressing Escape clears the field without creating a todo.
- Accessible: input has an associated label (or `aria-label`).

## TDD Cases

- Entering a title and pressing Enter creates a new item at the top of the list.
- Pressing Escape in the new-todo input clears without creating.
- Input cleared on successful creation.
- API error on create: input not cleared; error message displayed; list unchanged.
