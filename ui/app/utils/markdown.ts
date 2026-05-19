/**
 * markdown.ts — safe Markdown-to-HTML renderer for user-supplied content.
 *
 * Strategy:
 *   1. Render inline Markdown with the default `marked.parseInline`.
 *   2. Post-process the resulting HTML to:
 *        a. Replace `javascript:`, `vbscript:`, and `data:` hrefs with `#`.
 *        b. Add `target="_blank" rel="noopener noreferrer"` to every link.
 *
 * `parseInline` is intentionally used (not `parse`) so block-level elements
 * such as headings and lists are never emitted — todo titles are single-line.
 */

import { marked } from 'marked'

/** Protocol schemes that must not appear in href values. */
const UNSAFE_HREF_RE = /^\s*(?:javascript|vbscript|data):/i

/**
 * Post-process a raw marked HTML string to harden all `<a>` tags:
 * - Replace unsafe href values with `#`.
 * - Inject `target="_blank"` and `rel="noopener noreferrer"` when absent.
 */
function hardenLinks(html: string): string {
  // This regex matches an opening <a …> tag, capturing everything inside.
  // It is intentionally simple and relies on marked's well-formed output.
  return html.replace(/<a\s([^>]*)>/gi, (_match, attrs: string) => {
    // Sanitise href.
    const safeAttrs = attrs.replace(
      /href="([^"]*)"/i,
      (_m: string, href: string) =>
        UNSAFE_HREF_RE.test(href) ? 'href="#"' : `href="${href}"`,
    )
    // Append target/rel when absent (marked doesn't add them by default).
    const withTarget = safeAttrs.includes('target=')
      ? safeAttrs
      : `${safeAttrs} target="_blank"`
    const withRel = withTarget.includes('rel=')
      ? withTarget
      : `${withTarget} rel="noopener noreferrer"`
    return `<a ${withRel}>`
  })
}

/**
 * Render a string of inline Markdown to a safe HTML string.
 *
 * Returns a synchronous string.  `marked.parseInline` is synchronous by
 * default (the async option is false unless explicitly overridden).
 */
export function renderInlineMarkdown(text: string): string {
  const raw = marked.parseInline(text) as string
  return hardenLinks(raw)
}
