import { describe, expect, it } from 'vitest'
import { buildTree, filterCounts, flattenFiles, visibleFiles } from './Sidebar.helpers.ts'

const file = (path, overrides = {}) => ({ path, title: null, mtimeMs: 100, size: 1, ...overrides })

const files = [
  file('README.md', { title: 'Readme' }),
  file('plans/orders/release.md', { title: 'Release plan' }),
  file('plans/orders/validation.md'),
  file('guides/start.md'),
]

const base = { files, read: {}, commentCounts: new Map(), filter: 'all', query: '' }

describe('buildTree', () => {
  it('nests by folder, folders first, and compacts single-folder chains', () => {
    const tree = buildTree(base)
    expect(tree.map((n) => [n.kind, n.name])).toEqual([
      ['folder', 'guides'],
      ['folder', 'plans/orders'],
      ['file', 'README.md'],
    ])
    const plans = tree[1]
    expect(plans.path).toBe('plans/orders')
    expect(plans.children.map((n) => n.name)).toEqual(['release.md', 'validation.md'])
  })

  it('carries read status and comment counts', () => {
    const tree = buildTree({
      ...base,
      read: { 'README.md': 100, 'guides/start.md': 50 },
      commentCounts: new Map([['README.md', 2]]),
    })
    const readme = tree[2]
    expect(readme).toMatchObject({ status: 'read', comments: 2, title: 'Readme' })
    expect(tree[0].children[0].status).toBe('edited')
  })
})

describe('visibleFiles', () => {
  it('filters unread (edited counts as unread) and commented', () => {
    const read = { 'README.md': 100, 'guides/start.md': 50 }
    const unread = visibleFiles({ ...base, read, filter: 'unread' })
    expect(unread.map((f) => f.path)).toEqual([
      'plans/orders/release.md',
      'plans/orders/validation.md',
      'guides/start.md',
    ])
    const commented = visibleFiles({
      ...base,
      filter: 'commented',
      commentCounts: new Map([['guides/start.md', 1]]),
    })
    expect(commented.map((f) => f.path)).toEqual(['guides/start.md'])
  })

  it('matches the query against path and title, ignoring accents and case', () => {
    expect(visibleFiles({ ...base, query: 'RELEASE PLÁN' }).map((f) => f.path)).toEqual([
      'plans/orders/release.md',
    ])
    expect(visibleFiles({ ...base, query: 'nothing' })).toEqual([])
    expect(visibleFiles({ ...base, query: 'releasé' }).map((f) => f.path)).toEqual([
      'plans/orders/release.md',
    ])
    expect(visibleFiles({ ...base, query: 'readme' }).map((f) => f.path)).toEqual(['README.md'])
  })
})

describe('filterCounts', () => {
  it('counts each filter', () => {
    expect(filterCounts(files, { 'README.md': 100 }, new Map([['README.md', 1]]))).toEqual({
      all: 4,
      unread: 3,
      commented: 1,
    })
  })
})

describe('flattenFiles', () => {
  it('lists files in tree order', () => {
    expect(flattenFiles(buildTree(base)).map((f) => f.path)).toEqual([
      'guides/start.md',
      'plans/orders/release.md',
      'plans/orders/validation.md',
      'README.md',
    ])
  })
})
