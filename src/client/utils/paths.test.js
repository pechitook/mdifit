import { describe, expect, it } from 'vitest'
import {
  dirName,
  encodePath,
  fileName,
  isExternalHref,
  isMarkdownHref,
  resolveRelative,
} from './paths.ts'

describe('resolveRelative', () => {
  it('resolves against the folder of the current file', () => {
    expect(resolveRelative('plans/a.md', 'b.md')).toBe('plans/b.md')
    expect(resolveRelative('plans/a.md', './b.md')).toBe('plans/b.md')
    expect(resolveRelative('plans/a.md', '../guides/c.md')).toBe('guides/c.md')
    expect(resolveRelative('a.md', 'img/x.png')).toBe('img/x.png')
  })

  it('decodes escaped characters', () => {
    expect(resolveRelative('a.md', 'my%20notes.md')).toBe('my notes.md')
  })

  it('returns null when the link climbs above the root', () => {
    expect(resolveRelative('a.md', '../outside.md')).toBeNull()
    expect(resolveRelative('plans/a.md', '../../outside.md')).toBeNull()
  })
})

describe('isExternalHref', () => {
  it('detects schemes, protocol-relative and absolute links', () => {
    expect(isExternalHref('https://example.com')).toBe(true)
    expect(isExternalHref('mailto:a@b.c')).toBe(true)
    expect(isExternalHref('//cdn.example.com/x.png')).toBe(true)
    expect(isExternalHref('/abs/path.md')).toBe(true)
    expect(isExternalHref('relative.md')).toBe(false)
    expect(isExternalHref('../up.md')).toBe(false)
  })
})

describe('small helpers', () => {
  it('recognizes Markdown links', () => {
    expect(isMarkdownHref('a/b.md')).toBe(true)
    expect(isMarkdownHref('a/B.MARKDOWN')).toBe(true)
    expect(isMarkdownHref('a/b.png')).toBe(false)
  })

  it('encodes segments, not slashes', () => {
    expect(encodePath('a b/c#d.png')).toBe('a%20b/c%23d.png')
  })

  it('splits file and folder names', () => {
    expect(fileName('a/b/c.md')).toBe('c.md')
    expect(fileName('c.md')).toBe('c.md')
    expect(dirName('a/b/c.md')).toBe('a/b')
    expect(dirName('c.md')).toBe('')
  })
})
