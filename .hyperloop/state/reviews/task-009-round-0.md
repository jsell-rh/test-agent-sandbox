---
task_id: task-009
round: 0
role: implementer
verdict: pass
---

## Summary

Implemented the spec-compliant API error envelope for the Nuxt 4 + Nitro TODO application.

### Files created

- `server/utils/errorFormatter.ts` — Pure `formatApiError(err)` function that maps any thrown value to a `{ statusCode, body }` tuple. Handles domain errors (InvalidTitleError → 422, TodoNotFoundError → 404), H3 errors with our data envelope (pass-through), generic H3 errors (derive code from status code), and unknown errors (500 INTERNAL_ERROR with console.error).

- `server/plugins/apiErrorHandler.ts` — Nitro plugin using the `error` hook to intercept unhandled errors on `/api/` routes and respond with the spec-compliant envelope. Sets `event.handled = true` to prevent Nitro's default error response.

- `server/utils/errors.test.ts` — 8 unit tests covering all 5 functions in `errors.ts`.

- `server/utils/errorFormatter.test.ts` — 7 unit tests covering all branches of `formatApiError`.

### Files modified

- `server/middleware/errorHandler.ts` — Replaced the broken `sendError` approach with a clean implementation that calls `formatApiError`, then uses `setResponseStatus`, `setHeader`, and `send` to produce the spec-compliant envelope directly.

- `vitest.infra.config.ts` — Added `resolve.alias` for `~` → project root so that `~/server/...` imports in server files resolve correctly during Vitest runs.

### Verification

All 47 tests pass (`npx vitest run --config vitest.infra.config.ts`): 40 pre-existing + 7 new.
