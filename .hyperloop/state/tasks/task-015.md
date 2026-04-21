---
id: task-015
title: Todo Item Component
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-012, task-014]
round: 0
branch: null
pr: null
---

Implement the `TodoItem` component. Receives a `Todo` as a prop; dispatches actions via the UI store (task-014).

### Display state (non-editing)

- **Checkbox**: toggles `status` between `active` and `completed` via `store.toggleTodo(id)`. Has an associated `<label>` for accessibility.
- **Title text**: renders the todo title with full markdown support (spec: user-interface.spec.md). Double-click → enters edit mode (`store.setEditingTodo(id)`).
- **Delete button ("×")**: visible on hover. Calls `store.deleteTodo(id)`. Keyboard accessible.

### Edit mode (active when `store.editingTodoId === todo.id`)

- `<input>` pre-filled with current `TodoTitle`.
- Announced to screen readers (`aria-label` or `role="textbox"`).
- **Enter / blur**: if value non-empty → `store.updateTitle(id, value)`, clears `editingTodoId`. If value is empty → `store.deleteTodo(id)`, clears `editingTodoId`.
- **Escape**: cancels edit, restores original title display, clears `editingTodoId` (no API call).

### Accessibility

- Checkbox has an associated label.
- Edit input is announced to screen readers.
- All actions reachable without a mouse.

### Critical test cases

- Double-clicking title sets `editingTodoId`
- Pressing Escape in edit mode restores original title without API call
- Submitting blank title in edit mode calls `deleteTodo`
- Checkbox toggle calls `toggleTodo`
- Delete button calls `deleteTodo`
