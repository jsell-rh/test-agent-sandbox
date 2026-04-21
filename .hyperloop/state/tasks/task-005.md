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

Initialize the Nuxt 4 project with all required configuration. No UI components or API routes yet — this task establishes the skeleton only.

**Deliverables:**
- `package.json` with Nuxt 4, TypeScript, and any required dependencies (markdown renderer, Pinia, etc.)
- `nuxt.config.ts` — SSR disabled (SPA mode) or server-side configured for the API routes
- `tsconfig.json` baseline
- `.env.example` documenting `DATABASE_PATH` (default: `./todos.db`)
- `server/` directory structure placeholder for API routes
- `pages/` and `components/` directory structure placeholder for UI
- Linting and formatting config if used

**Configuration requirements from specs:**
- `DATABASE_PATH` env var consumed by the persistence layer (default `./todos.db`; `:memory:` for tests)
- Nuxt server routes will live under `server/api/todos/`
- Enterprise, clean visual design baseline (e.g. Tailwind CSS or equivalent)
- Full markdown support dependency included (e.g. `marked`, `@nuxtjs/mdc`, or `remark`)
