import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

/**
 * Markdown → safe HTML conversion.
 *
 * Uses `marked` for parsing and `sanitize-html` to strip
 * any dangerous tags/attributes before injecting into the DOM.
 *
 * Allowed inline elements only (block elements like <p>, <ul> etc. are
 * stripped to their content so that todo titles render as inline text).
 */

const ALLOWED_TAGS: string[] = [
  'strong',
  'b',
  'em',
  'i',
  'code',
  'del',
  's',
  'a',
  'span',
]

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'target', 'rel'],
}

/**
 * Parse `source` as Markdown and return sanitized inline HTML.
 * Safe to use with v-html.
 */
export function renderMarkdown(source: string): string {
  // marked.parseInline renders inline markdown without wrapping <p> tags
  const raw = marked.parseInline(source) as string
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
  })
}

/** Composable wrapper — returns a reactive render helper. */
export function useMarkdown() {
  return { renderMarkdown }
}
