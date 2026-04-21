---
id: task-018
title: Accessibility and keyboard navigation
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-014, task-015, task-017]
round: 0
branch: null
pr: null
---

Audit and implement accessibility and full keyboard navigation across all UI components using TDD (a11y-focused tests first).

**Requirements from spec:**
- Checkbox inputs have associated `<label>` elements (already covered in task-013 — verify and enforce here)
- Edit field is announced to screen readers when activated (ARIA live region or `aria-label`)
- All interactive actions are reachable without a mouse:
  - New todo input: Enter to submit, Escape to clear
  - Checkbox: Space to toggle
  - Delete button: Enter/Space to activate
  - Filter tabs: Arrow keys or Tab+Enter to navigate
  - "Clear completed": Enter/Space to activate
  - Edit mode: Enter to submit, Escape to cancel, triggered by keyboard (e.g. focusing title and pressing F2 or Enter)
- Focus is managed correctly after destructive actions (delete/clear completed): focus moves to a sensible next element
- Sufficient colour contrast for all visual states (active, completed, hover, focus)
- `role` and `aria-*` attributes are correct for the todo list (`role="list"`, items `role="listitem"`)

**Critical test cases:**
- All interactive elements reachable and operable via keyboard alone
- Checkbox label association passes axe-core accessibility check
- Edit field activation announces to screen readers
- Focus moves to next list item (or input) after deleting an item via keyboard
- Filter tab group has correct ARIA roles/attributes
- No axe-core violations on the main view in all filter states
