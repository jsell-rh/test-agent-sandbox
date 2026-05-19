/**
 * Nuxt plugin: exposes `marked` for client-side markdown rendering.
 *
 * Configured with:
 *  - gfm: true (GitHub Flavored Markdown)
 *  - breaks: false (clean rendering)
 *
 * DOMPurify is used in the composable to sanitize output.
 */
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: false,
})

export default defineNuxtPlugin(() => {
  return {
    provide: {
      marked: {
        marked,
        sanitize: (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
      },
    },
  }
})
