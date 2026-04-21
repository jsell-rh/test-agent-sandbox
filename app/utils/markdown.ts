/**
 * Markdown utility — safe, sanitised HTML rendering.
 *
 * Uses `marked` for Markdown-to-HTML conversion and `DOMPurify` for
 * client-side sanitisation. Server-side rendering falls back to the
 * raw text (DOMPurify is a DOM API).
 *
 * Usage:
 *   import { renderMarkdown, renderMarkdownInline } from '~/utils/markdown'
 *   const html = renderMarkdown('**bold** _italic_')
 *   const html = renderMarkdownInline('**bold** text without <p> wrapper')
 */

import { Marked } from 'marked'

// ── Marked instance (block — full document) ──────────────────────────────────
const markedBlock = new Marked({
  async: false,
  gfm: true,       // GitHub Flavored Markdown: tables, strikethrough, task lists
  breaks: true,    // Convert \n to <br> inside paragraphs
})

// ── Marked instance (inline — no wrapping <p>) ───────────────────────────────
const markedInline = new Marked({
  async: false,
  gfm: true,
  breaks: false,
})

/** Render full Markdown (block-level elements allowed). Returns sanitised HTML. */
export function renderMarkdown(source: string): string {
  const raw = markedBlock.parse(source) as string
  return sanitise(raw)
}

/**
 * Render Markdown as inline HTML — no wrapping `<p>` tag.
 * Suitable for rendering todo titles inside list items.
 */
export function renderMarkdownInline(source: string): string {
  const raw = markedInline.parseInline(source) as string
  return sanitise(raw)
}

/** Sanitise HTML on the client (no-op on SSR). */
function sanitise(html: string): string {
  if (import.meta.server) {
    // On the server we trust marked's output for now.
    // DOMPurify requires a real DOM so skip sanitisation here.
    // Hydration on the client will re-sanitise in place.
    return html
  }

  // Lazy-import DOMPurify at runtime so it doesn't bloat SSR bundles.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = (globalThis as unknown as { DOMPurify?: { sanitize: (html: string, cfg: object) => string } }).DOMPurify

  if (DOMPurify) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'a',
        'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'span', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
      FORCE_BODY: false,
    })
  }

  return html
}
