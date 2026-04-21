---
task_id: task-012
round: 0
role: implementer
verdict: pass
findings: 0
---

## Summary

Scaffolded a complete Nuxt 4 application under `ui/` with the following deliverables:

### Project structure
- `ui/package.json` — Nuxt 4, @nuxt/content v3, vitest, @nuxt/test-utils
- `ui/nuxt.config.ts` — full Nuxt 4 config: `future.compatibilityVersion: 4`, @nuxt/content with GFM + syntax highlighting, Inter/JetBrains Mono fonts via Google Fonts, strict TypeScript, API proxy runtime config
- `ui/tsconfig.json` — extends Nuxt-generated tsconfig with strict mode
- `ui/.gitignore` — ignores build artefacts, node_modules, .env
- `ui/.env.example` — documents API_BASE_URL and NUXT_PUBLIC_APP_NAME

### Nuxt 4 `app/` directory (srcDir)
- `app/app.vue` — root shell with NuxtLayout + NuxtPage
- `app/assets/css/main.css` — global stylesheet: CSS custom properties (design tokens), Inter typography, full `.prose` markdown styles (headings, code, tables, blockquotes, links)
- `app/layouts/default.vue` — enterprise layout: sticky `<header role="banner">` with brand link, `<main id="main-content" role="main" tabindex="-1">`, `<footer role="contentinfo">`, skip-to-content link for accessibility
- `app/pages/index.vue` — home page placeholder (todo interface wired in task-009)
- `app/pages/[...slug].vue` — catch-all route for @nuxt/content markdown pages
- `app/components/AppMarkdown.vue` — inline markdown renderer using MDCRenderer + parseMarkdown
- `app/components/AppErrorBanner.vue` — auto-dismiss error banner (5s default, configurable), role="alert" aria-live="assertive", emits "dismiss"
- `app/composables/useApiError.ts` — normalises Error / API envelope / string errors to human-readable strings; readonly errorMessage ref
- `app/composables/useTodoApi.ts` — typed wrapper for all REST endpoints in specs/interface.spec.md: listTodos, getTodo, createTodo, updateTodo, deleteTodo, clearCompleted

### Server
- `server/routes/api/[...path].ts` — Nitro proxy that forwards /api/** to backend (API_BASE_URL env var)
- `server/tsconfig.json` — extends Nuxt server tsconfig

### Content
- `content/index.md` — sample Getting Started page demonstrating full markdown: tables, code blocks, GFM

### Tests (written first — TDD)
- `tests/layouts/default.spec.ts` — 11 specs covering header/main/footer landmarks, ARIA roles, skip link, brand link href, CSS classes
- `tests/components/AppErrorBanner.spec.ts` — 5 specs: message render, ARIA, manual dismiss, auto-dismiss at custom duration, 5s default
- `tests/composables/useApiError.spec.ts` — 7 specs: null start, Error, envelope, string, unknown, clearError, readonly guard
- `tests/composables/useTodoApi.spec.ts` — 7 specs: each REST endpoint called with correct URL + method

### Markdown support (spec: "Full markdown support")
Implemented via `@nuxt/content` v3:
- GitHub Flavored Markdown (remark-gfm)
- Syntax highlighting (github-light/dark themes, 10 languages)
- `AppMarkdown` component for rendering markdown strings inline
- `[...slug].vue` catch-all for full markdown document pages
- `.prose` CSS class with complete typographic treatment

### Enterprise design foundations
- CSS custom properties for all colour tokens (ready for task-013 Tailwind overlay)
- Scoped component styles with BEM-like class names
- Sticky branded header, constrained main content (max-w-2xl), footer
- Full ARIA landmark structure: banner / main / contentinfo
- Skip-to-content link, tabindex="-1" on main for SPA route-change focus management
- Focus-visible outline with brand colour
