import { describe, expect, it } from 'vitest'
import { SHORTCUTS, matchShortcut } from './shortcuts.ts'

const key = (k, overrides = {}) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  editing: false,
  ...overrides,
})

describe('matchShortcut', () => {
  it('opens the palette with ⌘K or Ctrl+K, even while editing', () => {
    expect(matchShortcut(key('k', { metaKey: true }))).toBe('palette')
    expect(matchShortcut(key('K', { ctrlKey: true, editing: true }))).toBe('palette')
  })

  it('maps single keys', () => {
    expect(matchShortcut(key('c'))).toBe('comment')
    expect(matchShortcut(key('s'))).toBe('suggest')
    expect(matchShortcut(key('p'))).toBe('prompt')
    expect(matchShortcut(key('r'))).toBe('toggleRead')
    expect(matchShortcut(key('v'))).toBe('toggleMode')
    expect(matchShortcut(key(']'))).toBe('nextFile')
    expect(matchShortcut(key('['))).toBe('previousFile')
    expect(matchShortcut(key('?'))).toBe('help')
  })

  it('ignores single keys while typing or with modifiers', () => {
    expect(matchShortcut(key('c', { editing: true }))).toBeNull()
    expect(matchShortcut(key('c', { metaKey: true }))).toBeNull()
    expect(matchShortcut(key('C'))).toBeNull()
    expect(matchShortcut(key('x'))).toBeNull()
  })

  it('documents every action it handles', () => {
    const documented = new Set(SHORTCUTS.map((s) => s.action))
    for (const k of ['c', 's', 'p', 'r', 'v', ']', '[', '?']) {
      expect(documented.has(matchShortcut(key(k)))).toBe(true)
    }
  })
})
