import { describe, expect, it } from 'vitest'
import { LIMITS, extractHeadings, normalize, searchDocs, snippet } from './search.rules.ts'

const plan = [
  '---',
  'title: Plan',
  '---',
  '# Implementación de releases',
  '',
  'Habilitar el mecanismo de reconciliación primero en GrokBot.',
  '',
  '```bash',
  '# reconciliación inside a fence',
  '```',
  '',
  '## Mecanismo de reconciliación',
  'Texto.',
].join('\n')

describe('normalize', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalize('Reconciliación ÑANDÚ')).toBe('reconciliacion nandu')
  })
})

describe('extractHeadings', () => {
  it('finds ATX headings with their line, skipping fences and front matter', () => {
    expect(extractHeadings(plan)).toEqual([
      { level: 1, text: 'Implementación de releases', line: 4 },
      { level: 2, text: 'Mecanismo de reconciliación', line: 12 },
    ])
  })
})

describe('searchDocs', () => {
  const docs = [
    { path: 'plan.md', source: plan },
    { path: 'other.md', source: 'Nothing about it.\nreconciliacion without accent' },
  ]

  it('returns headings first, then text lines, accent-insensitive', () => {
    const hits = searchDocs(docs, 'reconciliacion')
    expect(hits.map((h) => [h.kind, h.path, h.line])).toEqual([
      ['heading', 'plan.md', 12],
      ['text', 'plan.md', 6],
      ['text', 'other.md', 2],
    ])
    expect(hits[0].level).toBe(2)
  })

  it('ignores queries shorter than two characters', () => {
    expect(searchDocs(docs, ' r ')).toEqual([])
  })

  it('caps text hits', () => {
    const many = Array.from({ length: LIMITS.text + 10 }, () => 'match here').join('\n')
    const hits = searchDocs([{ path: 'many.md', source: many }], 'match')
    expect(hits).toHaveLength(LIMITS.text)
  })
})

describe('snippet', () => {
  it('keeps short lines whole', () => {
    expect(snippet('  short line  ', 'short')).toBe('short line')
  })

  it('cuts long lines around the match', () => {
    const line = `${'a'.repeat(200)} needle ${'b'.repeat(200)}`
    const result = snippet(line, 'needle', 10)
    expect(result.startsWith('…')).toBe(true)
    expect(result.endsWith('…')).toBe(true)
    expect(result).toContain('needle')
  })
})
