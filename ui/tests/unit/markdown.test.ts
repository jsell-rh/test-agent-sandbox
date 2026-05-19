/**
 * Tests for the safe inline Markdown renderer.
 */

import { describe, it, expect } from 'vitest'
import { renderInlineMarkdown } from '../../app/utils/markdown'

describe('renderInlineMarkdown', () => {
  it('renders bold text', () => {
    expect(renderInlineMarkdown('**bold**')).toContain('<strong>bold</strong>')
  })

  it('renders italic text', () => {
    expect(renderInlineMarkdown('_italic_')).toContain('<em>italic</em>')
  })

  it('renders inline code', () => {
    expect(renderInlineMarkdown('`code`')).toContain('<code>code</code>')
  })

  it('renders plain text unchanged', () => {
    expect(renderInlineMarkdown('just text')).toBe('just text')
  })

  it('strips javascript: href links (XSS prevention)', () => {
    const output = renderInlineMarkdown('[click](javascript:alert(1))')
    expect(output).not.toContain('javascript:')
    expect(output).toContain('<a')
  })

  it('strips data: href links (XSS prevention)', () => {
    const output = renderInlineMarkdown('[click](data:text/html,<h1>)</h1>)')
    expect(output).not.toContain('data:')
  })

  it('strips vbscript: href links', () => {
    const output = renderInlineMarkdown('[click](vbscript:MsgBox("XSS"))')
    expect(output).not.toContain('vbscript:')
  })

  it('renders safe https: links with target=_blank and rel=noopener', () => {
    const output = renderInlineMarkdown('[link](https://example.com)')
    expect(output).toContain('href="https://example.com"')
    expect(output).toContain('target="_blank"')
    expect(output).toContain('rel="noopener noreferrer"')
  })

  it('returns a plain string (synchronous)', () => {
    const result = renderInlineMarkdown('hello')
    expect(typeof result).toBe('string')
  })
})
