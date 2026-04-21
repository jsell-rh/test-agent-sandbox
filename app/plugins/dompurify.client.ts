/**
 * DOMPurify plugin — client-only.
 *
 * Attaches DOMPurify to `globalThis` so that `~/utils/markdown.ts`
 * can access it without a dynamic import that breaks tree-shaking.
 *
 * The `.client.ts` suffix ensures Nuxt never loads this on the server.
 */
import DOMPurify from 'dompurify'

export default defineNuxtPlugin(() => {
  // Attach to globalThis for access in non-composable utility functions.
  ;(globalThis as unknown as Record<string, unknown>).DOMPurify = DOMPurify
})
