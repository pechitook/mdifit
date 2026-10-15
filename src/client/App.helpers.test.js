import { describe, expect, it } from 'vitest'
import { adjacentPath, nextUnreadPath, readCount } from './App.helpers.ts'

const file = (path, mtimeMs = 100) => ({ path, title: null, mtimeMs, size: 1 })

describe('adjacentPath', () => {
  const order = ['a.md', 'b.md', 'c.md']

  it('moves without wrapping', () => {
    expect(adjacentPath(order, 'b.md', 1)).toBe('c.md')
    expect(adjacentPath(order, 'b.md', -1)).toBe('a.md')
    expect(adjacentPath(order, 'c.md', 1)).toBeNull()
  })

  it('starts at the top when nothing is open', () => {
    expect(adjacentPath(order, null, 1)).toBe('a.md')
    expect(adjacentPath(order, 'gone.md', 1)).toBe('a.md')
  })
})

describe('nextUnreadPath', () => {
  const files = [file('a.md'), file('b.md'), file('c.md')]
  const order = ['a.md', 'b.md', 'c.md']

  it('finds the next unread file after the current one, wrapping', () => {
    expect(nextUnreadPath(order, files, { 'b.md': 100 }, 'a.md')).toBe('c.md')
    expect(nextUnreadPath(order, files, { 'a.md': 100 }, 'c.md')).toBe('b.md')
  })

  it('counts edited files as unread and returns null when all are read', () => {
    expect(nextUnreadPath(order, files, { 'b.md': 1, 'c.md': 100 }, 'a.md')).toBe('b.md')
    expect(nextUnreadPath(order, files, { 'b.md': 100, 'c.md': 100 }, 'a.md')).toBeNull()
  })
})

describe('readCount', () => {
  it('counts files read at their current version', () => {
    expect(readCount([file('a.md'), file('b.md')], { 'a.md': 100, 'b.md': 1 })).toBe(1)
  })
})
