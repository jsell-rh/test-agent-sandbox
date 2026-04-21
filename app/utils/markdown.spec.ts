/**
 * Tests for the markdown utility.
 *
 * Verifies that marked correctly converts Markdown syntax to HTML
 * and that the inline renderer strips block-level wrappers.
 *
 * Note: DOMPurify is not available in the test environment (no DOM),
 * so sanitisation is bypassed — we test the raw marked output only.
 */

import { describe, it, expect } from 'vitest'
import { renderMarkdown, renderMarkdownInline } from './markdown'

describe('renderMarkdown', () => {
  it('converts bold syntax to <strong>', () => {
    const html = renderMarkdown('**hello**')
    expect(html).toContain('<strong>hello</strong>')
  })

  it('converts italic syntax to <em>', () => {
    const html = renderMarkdown('_world_')
    expect(html).toContain('<em>world</em>')
  })

  it('converts strikethrough to <del>', () => {
    const html = renderMarkdown('~~done~~')
    expect(html).toContain('<del>done</del>')
  })

  it('converts inline code to <code>', () => {
    const html = renderMarkdown('`foo()`')
    expect(html).toContain('<code>foo()</code>')
  })

  it('wraps plain paragraph in <p>', () => {
    const html = renderMarkdown('plain text')
    expect(html.trim()).toMatch(/^<p>plain text<\/p>/)
  })

  it('converts links to <a>', () => {
    const html = renderMarkdown('[click](https://example.com)')
    expect(html).toContain('<a href="https://example.com">click</a>')
  })

  it('converts headings', () => {
    const html = renderMarkdown('# Heading 1')
    expect(html).toContain('<h1>')
  })

  it('converts unordered lists', () => {
    const html = renderMarkdown('- item one\n- item two')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>item one</li>')
  })

  it('handles empty string without throwing', () => {
    expect(() => renderMarkdown('')).not.toThrow()
  })
})

describe('renderMarkdownInline', () => {
  it('converts bold without wrapping <p>', () => {
    const html = renderMarkdownInline('**hello**')
    expect(html).toContain('<strong>hello</strong>')
    expect(html).not.toContain('<p>')
  })

  it('converts italic without wrapping <p>', () => {
    const html = renderMarkdownInline('_italic_')
    expect(html).toContain('<em>italic</em>')
    expect(html).not.toContain('<p>')
  })

  it('passes plain text through as-is', () => {
    const html = renderMarkdownInline('just text')
    expect(html).toBe('just text')
  })

  it('handles empty string without throwing', () => {
    expect(() => renderMarkdownInline('')).not.toThrow()
  })
})
