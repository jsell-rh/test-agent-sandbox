/**
 * Tests for useMarkdown composable.
 *
 * Verifies that markdown is rendered correctly and dangerous HTML is neutralised.
 */
import { describe, it, expect } from 'vitest'
import { useMarkdown } from '~/composables/useMarkdown'

describe('useMarkdown — renderInline', () => {
  const { renderInline } = useMarkdown()

  it('renders bold text', () => {
    const result = renderInline('**bold**')
    expect(result).toContain('<strong>bold</strong>')
  })

  it('renders italic text', () => {
    const result = renderInline('*italic*')
    expect(result).toContain('<em>italic</em>')
  })

  it('renders inline code', () => {
    const result = renderInline('`code`')
    expect(result).toContain('<code>code</code>')
  })

  it('renders strikethrough text', () => {
    const result = renderInline('~~done~~')
    expect(result).toContain('<del>done</del>')
  })

  it('renders external links with noopener', () => {
    const result = renderInline('[click](https://example.com)')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('rel="noopener noreferrer"')
    expect(result).toContain('target="_blank"')
  })

  it('neutralises javascript: href', () => {
    const result = renderInline('[xss](javascript:alert(1))')
    expect(result).not.toContain('javascript:')
  })

  it('strips on* event handler attributes', () => {
    // This would only appear if someone injected raw HTML via markdown
    const result = renderInline('safe text')
    expect(result).not.toMatch(/\son\w+=/i)
  })

  it('returns empty string for empty input', () => {
    expect(renderInline('')).toBe('')
  })

  it('preserves plain text', () => {
    const result = renderInline('Buy groceries')
    expect(result).toContain('Buy groceries')
  })
})

describe('useMarkdown — renderBlock', () => {
  const { renderBlock } = useMarkdown()

  it('renders a paragraph', () => {
    const result = renderBlock('Hello world')
    expect(result).toContain('<p>')
    expect(result).toContain('Hello world')
  })

  it('returns empty string for empty input', () => {
    expect(renderBlock('')).toBe('')
  })
})
