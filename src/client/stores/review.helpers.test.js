import { describe, expect, it } from 'vitest'
import {
  countByPath,
  newCommentId,
  parseState,
  readStatus,
  serializeState,
  sortComments,
  storageKey,
} from './review.helpers.ts'

const comment = (overrides) => ({
  id: 'c1',
  path: 'a.md',
  startLine: 3,
  endLine: 3,
  quote: null,
  body: 'text',
  suggestion: null,
  createdAt: 1,
  ...overrides,
})

describe('storage', () => {
  it('keys state by root path and version', () => {
    expect(storageKey('/repo/plans')).toBe('mdifit:v1:/repo/plans')
  })

  it('round-trips state', () => {
    const state = { comments: [comment()], read: { 'a.md': 10 } }
    expect(parseState(serializeState(state))).toEqual(state)
  })

  it('drops malformed data instead of throwing', () => {
    expect(parseState(null)).toEqual({ comments: [], read: {} })
    expect(parseState('not json')).toEqual({ comments: [], read: {} })
    expect(
      parseState(JSON.stringify({ comments: [comment(), { id: 2 }], read: { 'a.md': 'x' } })),
    ).toEqual({ comments: [comment()], read: {} })
  })
})

describe('sortComments', () => {
  it('orders by path, then line, then creation', () => {
    const sorted = sortComments([
      comment({ id: 'b', path: 'b.md' }),
      comment({ id: 'a2', startLine: 9 }),
      comment({ id: 'a1', startLine: 3, createdAt: 2 }),
      comment({ id: 'a0', startLine: 3, createdAt: 1 }),
    ])
    expect(sorted.map((c) => c.id)).toEqual(['a0', 'a1', 'a2', 'b'])
  })
})

describe('countByPath', () => {
  it('counts comments per file', () => {
    const counts = countByPath([comment(), comment({ id: 'x' }), comment({ path: 'b.md' })])
    expect([...counts]).toEqual([
      ['a.md', 2],
      ['b.md', 1],
    ])
  })
})

describe('readStatus', () => {
  const file = { path: 'a.md', title: null, mtimeMs: 100, size: 1 }

  it('is unread until marked', () => {
    expect(readStatus(file, {})).toBe('unread')
  })

  it('is read when marked at the current mtime', () => {
    expect(readStatus(file, { 'a.md': 100 })).toBe('read')
  })

  it('is edited when the file changed after it was read', () => {
    expect(readStatus(file, { 'a.md': 50 })).toBe('edited')
  })
})

describe('newCommentId', () => {
  it('is short and differs with time and randomness', () => {
    expect(newCommentId(1000, 0.5)).not.toBe(newCommentId(1000, 0.6))
    expect(newCommentId(1000, 0.5)).not.toBe(newCommentId(2000, 0.5))
  })
})
