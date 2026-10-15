import { describe, expect, it } from 'vitest'
import { folderOf, formatHash, isFolderPath, lineAnchor, parseHash } from './route.ts'

describe('parseHash', () => {
  it('reads the path and the anchor', () => {
    expect(parseHash('#/plans/a.md#scope')).toEqual({ path: 'plans/a.md', anchor: 'scope' })
    expect(parseHash('#/plans/a.md')).toEqual({ path: 'plans/a.md', anchor: null })
  })

  it('decodes escaped characters', () => {
    expect(parseHash('#/my%20notes/a.md#caf%C3%A9')).toEqual({
      path: 'my notes/a.md',
      anchor: 'café',
    })
  })

  it('is empty for anything that is not a route', () => {
    expect(parseHash('')).toEqual({ path: null, anchor: null })
    expect(parseHash('#scope')).toEqual({ path: null, anchor: null })
  })

  it('reads folders, the root included', () => {
    expect(parseHash('#/')).toEqual({ path: '', anchor: null })
    expect(parseHash('#/plans/openclaw/')).toEqual({ path: 'plans/openclaw/', anchor: null })
    expect(parseHash('#/plans/#scope')).toEqual({ path: 'plans/', anchor: 'scope' })
  })
})

describe('formatHash', () => {
  it('round-trips with parseHash', () => {
    const route = { path: 'my notes/a.md', anchor: 'café' }
    expect(parseHash(formatHash(route))).toEqual(route)
  })

  it('omits a missing anchor and is empty without a path', () => {
    expect(formatHash({ path: 'a.md', anchor: null })).toBe('#/a.md')
    expect(formatHash({ path: null, anchor: 'x' })).toBe('')
    expect(formatHash({ path: '', anchor: null })).toBe('#/')
    expect(formatHash({ path: 'my notes/', anchor: null })).toBe('#/my%20notes/')
  })
})

describe('lineAnchor', () => {
  it('reads line anchors only', () => {
    expect(lineAnchor('L12')).toBe(12)
    expect(lineAnchor('scope')).toBeNull()
    expect(lineAnchor('L')).toBeNull()
    expect(lineAnchor(null)).toBeNull()
  })
})

describe('folders', () => {
  it('tells folder paths from file paths', () => {
    expect(isFolderPath('')).toBe(true)
    expect(isFolderPath('plans/')).toBe(true)
    expect(isFolderPath('plans/a.md')).toBe(false)
    expect(isFolderPath(null)).toBe(false)
  })

  it('finds the folder of a file', () => {
    expect(folderOf('plans/openclaw/a.md')).toBe('plans/openclaw/')
    expect(folderOf('a.md')).toBe('')
  })
})
