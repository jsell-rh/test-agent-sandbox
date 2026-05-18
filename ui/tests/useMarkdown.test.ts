import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../app/composables/useMarkdown'

describe('renderMarkdown', () => {
  it('renders bold text', () => {
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>')
  })

  it('renders italic text', () => {
    expect(renderMarkdown('_italic_')).toContain('<em>italic</em>')
  })

  it('renders inline code', () => {
    const html = renderMarkdown('`code`')
    expect(html).toContain('<code>code</code>')
  })

  it('renders strikethrough', () => {
    const html = renderMarkdown('~~done~~')
    expect(html).toContain('<del>done</del>')
  })

  it('renders links', () => {
    const html = renderMarkdown('[click](https://example.com)')
    expect(html).toContain('<a')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('click')
  })

  it('strips script tags (XSS)', () => {
    const html = renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
  })

  it('strips onclick attributes (XSS)', () => {
    const html = renderMarkdown('<span onclick="alert(1)">hi</span>')
    expect(html).not.toContain('onclick')
  })

  it('returns plain text unchanged', () => {
    const html = renderMarkdown('Buy milk')
    expect(html).toContain('Buy milk')
  })

  it('handles empty string', () => {
    const html = renderMarkdown('')
    expect(html).toBe('')
  })

  it('handles combined markdown', () => {
    const html = renderMarkdown('**Task**: _review_ `code`')
    expect(html).toContain('<strong>')
    expect(html).toContain('<em>')
    expect(html).toContain('<code>')
  })
})
