---
id: task-012
title: Nuxt 4 project setup
spec_ref: specs/user-interface.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Summary

Scaffold the Nuxt 4 frontend application with enterprise-grade configuration and full Markdown rendering support.

## Scope

- Initialize a Nuxt 4 project
- Configure enterprise-grade baseline:
  - TypeScript strict mode
  - ESLint + Prettier
  - Clean, professional default styling (CSS reset, typography scale, design tokens)
- Integrate a Markdown rendering library (e.g., `@nuxtjs/mdc` or `remark`/`marked`) so that todo titles containing Markdown syntax are rendered correctly in the UI
- Configure the Nuxt dev server to proxy `/api/*` requests to the backend API server (for local development)
- Set up environment variables for API base URL

## Notes

- This task is frontend scaffolding only — no API calls or business logic yet.
- The "enterprise" aesthetic means clean spacing, consistent typography, accessible color contrast, and a minimal design system — not heavy UI frameworks unless they serve the design goal.
- Markdown support applies to todo title rendering in the list; the input/edit field accepts plain text.
