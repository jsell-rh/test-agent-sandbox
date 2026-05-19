/**
 * useMarkdown — wraps marked + DOMPurify for safe inline markdown rendering.
 *
 * Server-side: falls back to plain escaped text (no DOMPurify available).
 * Client-side: full marked + DOMPurify sanitization.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function useMarkdown() {
  function renderInline(text: string): string {
    if (import.meta.server) {
      // During SSR: return escaped plain text; client will hydrate with markdown
      return escapeHtml(text)
    }
    try {
      const { $marked } = useNuxtApp() as unknown as {
        $marked: { marked: typeof import('marked').marked; sanitize: (html: string) => string }
      }
      if (!$marked?.marked) return escapeHtml(text)
      const raw = $marked.marked.parseInline(text) as string
      return $marked.sanitize(raw)
    } catch {
      return escapeHtml(text)
    }
  }

  return { renderInline }
}
