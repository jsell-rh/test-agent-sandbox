---
id: task-012
title: Nuxt 4 Project Setup
spec_ref: specs/user-interface.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

Scaffold and configure a Nuxt 4 project as the frontend application.

### Requirements

- **Framework**: Nuxt 4 (not Nuxt 3)
- **TypeScript**: strict mode enabled throughout
- **Markdown support**: full markdown rendering (e.g. `@nuxtjs/mdc` or equivalent) — Todo titles may contain markdown
- **Style**: enterprise-grade baseline — linting (ESLint + Nuxt config), formatting (Prettier), no placeholder pages
- **SSR / SPA mode**: SPA (no server-side rendering required; API is served separately)
- **Directory structure**: follows Nuxt 4 `app/` directory convention
- **Environment**: `NUXT_PUBLIC_API_BASE` (or equivalent) configures the API base URL; defaults to `/api`

### Deliverables

- `package.json` with all dependencies
- `nuxt.config.ts` with TypeScript, markdown, and API base config
- `.eslintrc` / `eslint.config.mjs` and `prettier.config.mjs`
- Empty `app/` directory structure ready for components, pages, and composables
- `README` snippet (inline comment in nuxt.config.ts) noting how to run dev and build
