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
  // ── Inline elements ──────────────────────────────────────────────────────

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

  // ── Block elements ───────────────────────────────────────────────────────

  it('converts h1 heading', () => {
    const html = renderMarkdown('# Heading 1')
    expect(html).toContain('<h1>')
    expect(html).toContain('Heading 1')
  })

  it('converts h2 heading', () => {
    const html = renderMarkdown('## Heading 2')
    expect(html).toContain('<h2>')
    expect(html).toContain('Heading 2')
  })

  it('converts h3 heading', () => {
    const html = renderMarkdown('### Heading 3')
    expect(html).toContain('<h3>')
  })

  it('converts unordered lists', () => {
    const html = renderMarkdown('- item one\n- item two')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>item one</li>')
    expect(html).toContain('<li>item two</li>')
  })

  it('converts ordered lists', () => {
    const html = renderMarkdown('1. first\n2. second')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>first</li>')
    expect(html).toContain('<li>second</li>')
  })

  it('converts blockquote', () => {
    const html = renderMarkdown('> quoted text')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('quoted text')
  })

  it('converts fenced code block', () => {
    const html = renderMarkdown('```\nconst x = 1;\n```')
    expect(html).toContain('<pre>')
    expect(html).toContain('<code>')
    expect(html).toContain('const x = 1;')
  })

  it('converts horizontal rule', () => {
    const html = renderMarkdown('---')
    expect(html).toContain('<hr')
  })

  // ── GFM (GitHub Flavoured Markdown) ─────────────────────────────────────

  it('converts GFM table to <table>', () => {
    const md = '| Name | Value |\n| --- | --- |\n| foo | bar |'
    const html = renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<thead>')
    expect(html).toContain('<th>')
    expect(html).toContain('Name')
    expect(html).toContain('<tbody>')
    expect(html).toContain('<td>')
    expect(html).toContain('foo')
    expect(html).toContain('bar')
  })

  it('converts GFM task list items', () => {
    const html = renderMarkdown('- [ ] unchecked\n- [x] checked')
    expect(html).toContain('<input')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('unchecked')
    expect(html).toContain('checked')
  })

  it('handles bold+italic combination', () => {
    const html = renderMarkdown('**_bold italic_**')
    expect(html).toContain('<strong>')
    expect(html).toContain('<em>')
  })

  it('handles nested markdown in list items', () => {
    const html = renderMarkdown('- **bold** item\n- _italic_ item')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('handles empty string without throwing', () => {
    expect(() => renderMarkdown('')).not.toThrow()
  })

  it('returns empty string for empty input', () => {
    const html = renderMarkdown('')
    expect(html.trim()).toBe('')
  })

  it('handles special HTML characters safely', () => {
    const html = renderMarkdown('5 > 3 and 2 < 4')
    // marked escapes these in text nodes
    expect(html).not.toContain('<script>')
    expect(html).toContain('5')
    expect(html).toContain('3')
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

  it('converts strikethrough without wrapping <p>', () => {
    const html = renderMarkdownInline('~~done~~')
    expect(html).toContain('<del>done</del>')
    expect(html).not.toContain('<p>')
  })

  it('converts inline code without wrapping <p>', () => {
    const html = renderMarkdownInline('`code()`')
    expect(html).toContain('<code>code()</code>')
    expect(html).not.toContain('<p>')
  })

  it('converts inline links without wrapping <p>', () => {
    const html = renderMarkdownInline('[link](https://example.com)')
    expect(html).toContain('<a href="https://example.com">link</a>')
    expect(html).not.toContain('<p>')
  })

  it('handles combined inline elements', () => {
    const html = renderMarkdownInline('**bold** and _italic_ and `code`')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<code>code</code>')
    expect(html).not.toContain('<p>')
  })

  it('passes plain text through as-is', () => {
    const html = renderMarkdownInline('just text')
    expect(html).toBe('just text')
  })

  it('handles empty string without throwing', () => {
    expect(() => renderMarkdownInline('')).not.toThrow()
  })

  it('returns empty string for empty input', () => {
    const html = renderMarkdownInline('')
    expect(html).toBe('')
  })

  it('does not produce block-level elements for inline content', () => {
    const html = renderMarkdownInline('**hello** world')
    expect(html).not.toContain('<p>')
    expect(html).not.toContain('<div>')
    expect(html).not.toContain('<ul>')
  })
})
