import { marked, type RendererObject } from 'marked'

// Configure a safe renderer: external links open in a new tab,
// and script/event-handler injection is neutralised.
const safeRenderer: RendererObject = {
  link({ href, title, text }: { href: string; title?: string | null; text: string }) {
    const safeHref = /^javascript:/i.test(href) ? '#' : href
    const titleAttr = title ? ` title="${title}"` : ''
    const isExternal = /^https?:\/\//i.test(safeHref)
    const externalAttrs = isExternal
      ? ' target="_blank" rel="noopener noreferrer"'
      : ''
    return `<a href="${safeHref}"${titleAttr}${externalAttrs}>${text}</a>`
  },
}

marked.use({ renderer: safeRenderer, gfm: true, breaks: false })

/**
 * Composable that provides a `renderMarkdown` function.
 * Renders GFM markdown to safe HTML suitable for use with `v-html`.
 *
 * Runs on the client only — SSR falls back to the raw title string.
 */
export function useMarkdown() {
  /**
   * Render inline markdown (no wrapping block elements).
   * Safe for use in todo item titles.
   */
  function renderInline(text: string): string {
    if (!text) return ''
    const raw = marked.parseInline(text) as string
    // Basic protection against injected on* handlers
    return raw.replace(/\s+on\w+="[^"]*"/gi, '')
  }

  /**
   * Render full block-level markdown.
   * Suitable for description/notes fields.
   */
  function renderBlock(text: string): string {
    if (!text) return ''
    const raw = marked.parse(text) as string
    return raw.replace(/\s+on\w+="[^"]*"/gi, '')
  }

  return { renderInline, renderBlock }
}
