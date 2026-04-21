---
id: task-018
title: Markdown rendering support in todo titles
spec_ref: specs/user-interface.spec.md
status: not-started
phase: null
deps: [task-015]
round: 0
branch: null
pr: null
---

## Scope

Enable full markdown rendering for todo title display in the `TodoItem` component.

### Behaviour

- When displaying a todo title (non-edit mode), render it as parsed markdown HTML
- Inline elements (bold, italic, code, links) render correctly
- Block elements that exceed a single line (headings, paragraphs) render inline or are stripped — title field is a single-line context
- In edit mode: the raw markdown source text is shown in the input field, not rendered HTML
- Markdown rendering must not introduce XSS vectors (sanitize output)

### Suggested Approach

- Use `@nuxtjs/mdc`, `marked`, or `remark` (whichever was declared in task-005 scaffold)
- Wrap markdown rendering in a dedicated `MarkdownTitle.vue` component used by `TodoItem`

## Test Cases (write tests first)

- `**bold**` renders as `<strong>bold</strong>`
- `_italic_` renders as `<em>italic</em>`
- `` `code` `` renders as `<code>code</code>`
- Raw markdown source appears in edit-mode input (not rendered)
- Malicious input (`<script>alert(1)</script>`) is sanitized and not executed
