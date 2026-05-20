/**
 * Nuxt composable that wraps createTodosStore with Nuxt's $fetch and runtime config.
 *
 * A module-level singleton is used so that all components share the same reactive
 * state throughout the SPA session (appropriate because ssr: false).
 *
 * In unit tests, import createTodosStore from ~/stores/todos and inject a mock
 * fetcher — do not import this composable directly.
 */

import { createTodosStore } from '~/stores/todos'
import type { TodosStore } from '~/stores/todos'

let _store: TodosStore | null = null

export function useTodos(): TodosStore {
  if (!_store) {
    const runtimeConfig = useRuntimeConfig()
    const apiBase = runtimeConfig.public.apiBase as string
    const errorDismissMs = runtimeConfig.public.errorDismissMs as number

    _store = createTodosStore({
      // Wrap Nuxt's $fetch so its signature matches StoreFetch.
      // $fetch is auto-imported by Nuxt; the explicit cast satisfies TypeScript.
      fetch: (url, opts) =>
        ($fetch as (url: string, opts?: Record<string, unknown>) => Promise<unknown>)(url, {
          method: opts?.method,
          body: opts?.body as Record<string, unknown> | undefined,
          params: opts?.params,
        }),
      apiBase,
      errorDismissMs,
    })
  }
  return _store
}
