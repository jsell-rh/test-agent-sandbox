---
id: task-015
title: TodoItem component (checkbox, title display, delete button, edit mode)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-014]
round: 0
branch: null
pr: null
---

## Scope

Implement the `TodoItem` component that renders a single Todo entry with all its interactions.

### Component: `TodoItem.vue`

**Props**: `todo: Todo`, `isEditing: boolean`

**Display mode** (not editing):
- Checkbox — toggles status between active/completed via `PATCH /api/todos/:id { status: toggled }`
- Title text — rendered with markdown support; double-click enters edit mode
- Delete button ("×") — visible on hover; calls `DELETE /api/todos/:id`; keyboard accessible

**Edit mode** (when `isEditing = true`):
- Text input pre-filled with current `TodoTitle`
- Enter key or blur → submit `PATCH /api/todos/:id { title: newTitle }`
- Escape key → cancel edit (no API call, restore original title in input)
- Submitting empty string → `DELETE /api/todos/:id`

**Accessibility**:
- Checkbox has an associated `<label>`
- Edit input announced to screen readers (`aria-label`)
- Delete button has accessible label

## Test Cases (write tests first)

- Renders todo title and checkbox
- Checkbox click calls toggle handler
- Double-click on title emits `startEdit` event
- Pressing Enter in edit input calls update handler with new title
- Pressing Escape in edit input emits `cancelEdit` without calling API
- Submitting empty string in edit input calls delete handler
- Delete button visible on hover (or always visible); click calls delete handler
- `isEditing=false` shows display mode; `isEditing=true` shows input mode
