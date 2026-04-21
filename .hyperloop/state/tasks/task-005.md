---
id: task-005
title: Nuxt 4 project scaffold and configuration
spec_ref: specs/user-interface.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Scope

Initialize the Nuxt 4 application that will host both the UI (pages/components) and the API (server routes under `server/api/`).

### Deliverables

- Nuxt 4 project initialised with required dependencies
- `nuxt.config.ts` configured for:
  - Enterprise/clean aesthetic (global CSS reset, design tokens or Tailwind)
  - Markdown support dependency declared (e.g., `@nuxtjs/mdc` or `remark`-based)
  - Server routes enabled (default in Nuxt 4)
- Directory structure scaffolded:
  - `server/api/` — API routes (empty placeholders)
  - `components/` — UI components (empty placeholders)
  - `pages/` — page files
  - `composables/` — shared logic
- ESLint / TypeScript strict mode configured
- Environment variable `DATABASE_PATH` documented in `.env.example`
- Basic smoke test: dev server starts without errors

### Notes

- No business logic, no UI components, no API routes implemented in this task — scaffold only.
- Domain model code (tasks 001–004) lives in a sibling `domain/` or `shared/domain/` directory outside `server/` and `components/`.
