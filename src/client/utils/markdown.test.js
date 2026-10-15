import { describe, expect, it } from 'vitest'
import { blankFrontMatter, renderMarkdown, slugify } from './markdown.ts'

const doc = [
  '# Title', //                1
  '', //                       2
  'First paragraph', //        3
  'continues here.', //        4
  '', //                       5
  '- one', //                  6
  '- two', //                  7
  '', //                       8
  '```js', //                  9
  'const a = 1', //            10
  '```', //                    11
].join('\n')

describe('renderMarkdown blocks', () => {
  it('splits top-level blocks with their source lines', () => {
    const { blocks } = renderMarkdown(doc, 'a.md')
    expect(blocks.map((b) => [b.startLine, b.endLine])).toEqual([
      [1, 1],
      [3, 4],
      [6, 7],
      [9, 11],
    ])
    expect(blocks[1].html).toContain('<p data-line-start="3" data-line-end="4">')
  })

  it('tags nested blocks too, so selections inside lists are precise', () => {
    const { blocks } = renderMarkdown(doc, 'a.md')
    expect(blocks[2].html).toContain('<li data-line-start="7" data-line-end="7">')
  })

  it('highlights known languages and escapes raw HTML', () => {
    const { blocks } = renderMarkdown(
      '```js\nconst a = 1\n```\n\n<script>alert(1)</script>',
      'a.md',
    )
    expect(blocks[0].html).toContain('hljs-keyword')
    expect(blocks[1].html).toContain('&lt;script&gt;')
    expect(blocks[1].html).not.toContain('<script>')
  })
})

describe('renderMarkdown headings', () => {
  it('collects an outline with unique ids', () => {
    const { headings, blocks } = renderMarkdown('# Plan\n\n## Scope\n\n## Scope', 'a.md')
    expect(headings).toEqual([
      { level: 1, text: 'Plan', slug: 'plan', line: 1 },
      { level: 2, text: 'Scope', slug: 'scope', line: 3 },
      { level: 2, text: 'Scope', slug: 'scope-1', line: 5 },
    ])
    expect(blocks[2].html).toContain('id="scope-1"')
  })
})

describe('renderMarkdown front matter', () => {
  it('hides front matter but keeps line numbers', () => {
    const { blocks, headings } = renderMarkdown('---\ntitle: x\n---\n# Title', 'a.md')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].startLine).toBe(4)
    expect(headings[0].line).toBe(4)
  })

  it('blanks only a closed front matter', () => {
    expect(blankFrontMatter('---\na: 1\n---\nbody')).toBe('\n\n\nbody')
    expect(blankFrontMatter('---\nno end')).toBe('---\nno end')
    expect(blankFrontMatter('body')).toBe('body')
  })
})

describe('renderMarkdown links and images', () => {
  it('routes relative Markdown links inside the app', () => {
    const { blocks } = renderMarkdown(
      '[b](../guides/b.md#install) [c](c.md) [top](#title)',
      'plans/a.md',
    )
    expect(blocks[0].html).toContain('href="#/guides/b.md#install"')
    expect(blocks[0].html).toContain('href="#/plans/c.md"')
    expect(blocks[0].html).toContain('href="#/plans/a.md#title"')
  })

  it('opens external links in a new tab', () => {
    const { blocks } = renderMarkdown('[x](https://example.com)', 'a.md')
    expect(blocks[0].html).toContain('target="_blank"')
    expect(blocks[0].html).toContain('rel="noopener noreferrer"')
  })

  it('loads relative images through /raw', () => {
    const { blocks } = renderMarkdown('![flow](../img/flow%20chart.svg)', 'plans/a.md')
    expect(blocks[0].html).toContain('src="/raw/img/flow%20chart.svg"')
  })
})

describe('renderMarkdown alerts and task lists', () => {
  it('turns [!NOTE] blockquotes into alerts', () => {
    const { blocks } = renderMarkdown('> [!WARNING]\n> Careful here.', 'a.md')
    expect(blocks[0].html).toContain('class="alert alert-warning"')
    expect(blocks[0].html).toContain('data-alert="Warning"')
    expect(blocks[0].html).not.toContain('[!WARNING]')
    expect(blocks[0].html).toContain('Careful here.')
  })

  it('renders task list checkboxes', () => {
    const { blocks } = renderMarkdown('- [x] done\n- [ ] todo', 'a.md')
    expect(blocks[0].html).toContain('<input type="checkbox" disabled checked> done')
    expect(blocks[0].html).toContain('<input type="checkbox" disabled> todo')
  })
})

describe('slugify', () => {
  it('follows GitHub ids', () => {
    expect(slugify('Scope of the first delivery')).toBe('scope-of-the-first-delivery')
    expect(slugify('M0 · Contracts & more!')).toBe('m0--contracts--more')
    expect(slugify('Implementación')).toBe('implementación')
  })
})
