import { describe, expect, it } from 'vitest'
import {
  FILE_LIMIT,
  fuzzyScore,
  highlightParts,
  hitItems,
  matchFiles,
} from './CommandPalette.helpers.ts'

const file = (path, title = null) => ({ path, title, mtimeMs: 1, size: 1 })

describe('fuzzyScore', () => {
  it('matches characters in order and rejects otherwise', () => {
    expect(fuzzyScore('rpl', 'plans/rollout-plan.md')).not.toBeNull()
    expect(fuzzyScore('xyz', 'plans/rollout-plan.md')).toBeNull()
  })

  it('prefers matches in the file name and consecutive runs', () => {
    const inName = fuzzyScore('release', 'plans/release.md')
    const inFolder = fuzzyScore('release', 'release/notes.md')
    expect(inName).toBeGreaterThan(inFolder)
  })
})

describe('matchFiles', () => {
  it('ranks and caps file results', () => {
    const files = [file('guides/start.md'), file('plans/release.md', 'Release plan'), file('x.md')]
    const items = matchFiles(files, 'rel')
    expect(items[0]).toEqual({
      key: 'file:plans/release.md',
      kind: 'file',
      path: 'plans/release.md',
      line: null,
      label: 'plans/release.md',
      detail: 'Release plan',
    })
    const many = Array.from({ length: 20 }, (_, i) => file(`f${i}.md`))
    expect(matchFiles(many, 'f')).toHaveLength(FILE_LIMIT)
  })
})

describe('hitItems', () => {
  it('labels headings with their level and points at the line', () => {
    const [heading, text] = hitItems([
      { kind: 'heading', path: 'a.md', line: 3, text: 'Scope', level: 2 },
      { kind: 'text', path: 'b.md', line: 9, text: 'some text', level: null },
    ])
    expect(heading).toMatchObject({ label: '## Scope', line: 3, detail: 'a.md:L3' })
    expect(text).toMatchObject({ label: 'some text', path: 'b.md', line: 9 })
  })
})

describe('highlightParts', () => {
  it('splits around the first match, accent-insensitive', () => {
    expect(highlightParts('Mecanismo de reconciliación', 'reconciliacion')).toEqual([
      { text: 'Mecanismo de ', match: false },
      { text: 'reconciliación', match: true },
    ])
    expect(highlightParts('abc', 'z')).toEqual([{ text: 'abc', match: false }])
  })
})
