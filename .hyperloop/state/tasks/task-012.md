---
id: task-012
title: Nuxt 4 Application Scaffold
spec_ref: specs/user-interface.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Scope

Bootstrap the Nuxt 4 project that will serve as the SPA shell for the Todo application.
All subsequent UI tasks build on top of this scaffold.

### Project initialisation

- Run `nuxi init` (Nuxt 4) to produce the baseline project.
- Delete generated boilerplate that conflicts with spec requirements (sample pages, default
  styles, etc.).
- Commit only the lean, configured skeleton — no placeholder content.

### `nuxt.config.ts`

```ts
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: false,                       // spec requires a client-side SPA
  typescript: { strict: true },
  runtimeConfig: {
    public: {
      apiBase: '/api'               // overridable via NUXT_PUBLIC_API_BASE env var
    }
  }
})
```

### Directory structure to establish (empty files / `.gitkeep` as needed)

```
pages/
  index.vue          # Todo list view — empty shell, wired in task-009
components/
  todo/              # Todo-specific components — populated in task-009+
  ui/                # Design-system primitives — populated in task-013
composables/
  useTodos.ts        # Empty composable stub — implemented in task-009
public/
  favicon.ico
app.vue              # Root layout with <NuxtPage /> outlet
```

### TypeScript

- `tsconfig.json` extended from `.nuxt/tsconfig.json` (Nuxt auto-generates).
- `strict: true` enforced.
- No `any` escape hatches in scaffold files.

### Test infrastructure

- Install `@nuxt/test-utils` and `vitest`.
- `vitest.config.ts` configured to use `@nuxt/test-utils/config`.
- Add a smoke test: mounting `app.vue` renders without throwing.

### TDD: Required test cases (write tests first)

- Nuxt app mounts without runtime errors.
- `useRuntimeConfig().public.apiBase` resolves to `'/api'` when env var is absent.
- `pages/index.vue` is served at route `/`.
