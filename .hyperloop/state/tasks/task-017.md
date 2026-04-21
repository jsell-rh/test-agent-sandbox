---
id: task-017
title: Markdown rendering for todo titles
spec_ref: specs/user-interface.spec.md
status: not-started
phase: null
deps: [task-013]
round: 0
branch: null
pr: null
---

Add full markdown rendering support for todo titles in the `TodoItem` display component.

**Requirements:**
- Todo title text in the list view is rendered as markdown (bold, italic, inline code, links, etc.)
- Edit mode input field shows the raw markdown source (not rendered HTML) for editing
- Markdown rendering is sanitised to prevent XSS (no raw `<script>` tags, unsafe HTML attributes, etc.)
- Enterprise/clean styling: markdown elements should inherit the application's design tokens (font, colour, spacing)

**Implementation notes:**
- Use the markdown library included during project scaffold (task-005), e.g. `marked` + `DOMPurify`, `@nuxtjs/mdc`, or `remark`/`rehype`
- Inline markdown only is acceptable for the list view (no block-level elements like headings/horizontal rules)
- Display an unrendered fallback if the markdown library fails to parse

**Critical test cases:**
- `**bold**` in a title renders as `<strong>bold</strong>` in the list view
- `_italic_` renders as `<em>italic</em>`
- `` `code` `` renders as `<code>code</code>`
- `<script>alert(1)</script>` in title is sanitised and not executed
- Edit field shows raw markdown source, not rendered HTML
- Rendering failure shows original raw string as fallback
