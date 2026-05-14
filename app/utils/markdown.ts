/**
 * Markdown rendering utility.
 *
 * Parses markdown text to sanitized HTML for safe v-html rendering.
 * Uses `marked` for parsing (GitHub Flavored Markdown) and
 * `sanitize-html` for XSS sanitization (isomorphic — works in both Node and browser).
 */

import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

// Configure marked with GFM (GitHub Flavored Markdown) and line breaks
marked.use({
  gfm: true,
  breaks: true,
  async: false,
})

/** Allowed HTML tags in rendered markdown output. */
const ALLOWED_TAGS: sanitizeHtml.IOptions['allowedTags'] = [
  'b',
  'i',
  'em',
  'strong',
  'code',
  'pre',
  'del',
  's',
  'a',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]

const SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Force links to open in new tabs with safe rel attribute
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  },
}

/**
 * Parse markdown text and return sanitized HTML.
 *
 * Safe to use with `v-html` — all dangerous content is stripped.
 * Works in both server-side (SSR) and client-side rendering contexts.
 */
export function renderMarkdown(text: string): string {
  const rawHtml = marked.parse(text, { async: false }) as string
  return sanitizeHtml(rawHtml, SANITIZE_CONFIG)
}

/**
 * Render markdown as inline HTML, stripping the wrapping `<p>` tag.
 *
 * Useful for short todo titles that would otherwise be wrapped in a block element.
 * Falls back to full block rendering if content spans multiple paragraphs.
 */
export function renderMarkdownInline(text: string): string {
  const fullHtml = renderMarkdown(text)
  // Remove single wrapping <p>...</p> for one-liner content
  return fullHtml.replace(/^<p>([\s\S]*?)<\/p>\n*$/, '$1').trim()
}
