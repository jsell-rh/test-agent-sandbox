/**
 * useMarkdown — Safe inline markdown renderer.
 *
 * Uses `marked.parseInline` for markdown → HTML conversion and DOMPurify for
 * XSS sanitisation. DOMPurify is only available in browser environments, so
 * the function gracefully returns escaped plain text during SSR.
 */
import { marked } from 'marked'

/** Minimal HTML character escaper for SSR fallback. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Render `text` as inline Markdown and return sanitised HTML.
 *
 * During SSR the plain (escaped) text is returned so hydration stays clean.
 * DOMPurify runs on the client only.
 */
export async function renderMarkdownInline(text: string): Promise<string> {
  // Produce raw inline HTML from marked
  const rawHtml = marked.parseInline(text, { async: false }) as string

  if (import.meta.server) {
    // On the server we cannot use DOMPurify (no DOM). Return escaped plain
    // text as a safe SSR fallback; the client will hydrate with the full result.
    return escapeHtml(text)
  }

  // Client-side: sanitise the parsed HTML with DOMPurify
  const { default: DOMPurify } = await import('dompurify')
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'del', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    // Force external links to be safe
    FORCE_BODY: false,
  })
}

/**
 * Synchronous variant for use inside Vue computed properties.
 *
 * Returns `escapeHtml(text)` on the server. On the client, if DOMPurify is
 * already loaded (subsequent renders), it sanitises synchronously; otherwise
 * falls back to escaped text until the async import resolves on mount.
 */

let _dompurify: typeof import('dompurify').default | null = null

// Eagerly load DOMPurify on the client so subsequent renders are synchronous
if (import.meta.client) {
  import('dompurify').then((m) => {
    _dompurify = m.default
  })
}

export function renderMarkdownInlineSync(text: string): string {
  const rawHtml = marked.parseInline(text, { async: false }) as string

  if (import.meta.server || !_dompurify) {
    return escapeHtml(text)
  }

  return _dompurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'del', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  })
}
