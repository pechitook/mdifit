import { describe, expect, it } from 'vitest'
import { folderEntries, folderExists, folderName, listFolder } from './Folder.helpers.ts'

const file = (path, overrides = {}) => ({ path, title: null, mtimeMs: 100, size: 1, ...overrides })

const files = [
  file('README.md'),
  file('plans/queue/AGENTS.md'),
  file('plans/queue/README.md', { title: 'Queue migration' }),
  file('plans/queue/rollout-checks.md'),
  file('plans/queue/deep/index.md'),
  file('plans/orders/proposal.md'),
]

describe('folderEntries', () => {
  it('prefers README, then AGENTS, then index, direct children only', () => {
    expect(folderEntries(files, 'plans/queue/')).toEqual([
      'plans/queue/README.md',
      'plans/queue/AGENTS.md',
    ])
    expect(folderEntries(files, '')).toEqual(['README.md'])
    expect(folderEntries(files, 'plans/')).toEqual([])
  })
})

describe('folderExists', () => {
  it('is true for the root and folders holding files', () => {
    expect(folderExists(files, '')).toBe(true)
    expect(folderExists(files, 'plans/')).toBe(true)
    expect(folderExists(files, 'nope/')).toBe(false)
  })
})

describe('listFolder', () => {
  it('lists direct files and subfolders with totals', () => {
    const listing = listFolder(
      files,
      'plans/queue/',
      { 'plans/queue/README.md': 100, 'plans/queue/AGENTS.md': 50 },
      new Map([
        ['plans/queue/AGENTS.md', 2],
        ['plans/queue/deep/index.md', 1],
      ]),
    )
    expect(listing.folders).toEqual([
      { name: 'deep', path: 'plans/queue/deep/', files: 1, unread: 1, comments: 1 },
    ])
    expect(listing.files.map((f) => [f.name, f.status, f.comments, f.title])).toEqual([
      ['AGENTS.md', 'edited', 2, null],
      ['README.md', 'read', 0, 'Queue migration'],
      ['rollout-checks.md', 'unread', 0, null],
    ])
  })

  it('lists the root', () => {
    const listing = listFolder(files, '', {}, new Map())
    expect(listing.folders.map((f) => [f.name, f.files])).toEqual([['plans', 5]])
    expect(listing.files.map((f) => f.name)).toEqual(['README.md'])
  })
})

describe('folderName', () => {
  it('uses the last segment, or the root name', () => {
    expect(folderName('plans/queue/', 'docs')).toBe('queue')
    expect(folderName('', 'docs')).toBe('docs')
  })
})
