---
title: Getting Started
description: Learn how to use the Todos application.
---

# Getting Started

Welcome to **Todos** — an enterprise-grade task management application.

## Features

- **Create todos** — add tasks with a title and optional markdown description.
- **Toggle status** — mark tasks as complete or reopen them.
- **Filter view** — view all, active, or completed tasks.
- **Inline editing** — double-click any task title to edit it.
- **Keyboard navigation** — fully accessible, no mouse required.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit new todo / save edit |
| `Escape` | Cancel edit |
| `Tab` | Move focus |
| `Space` | Toggle checkbox |

## Markdown Support

Todo titles and descriptions support **full GitHub Flavored Markdown**:

- Emphasis: *italic*, **bold**, ~~strikethrough~~
- Inline `code` spans
- [Links](https://example.com)

```typescript
// Example: create a todo via the API
const todo = await $fetch('/api/todos', {
  method: 'POST',
  body: { title: 'Review the architecture document' },
})
```

> **Tip:** Use `Escape` to cancel an edit without saving changes.
