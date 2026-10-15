import { describe, expect, it } from 'vitest'
import { folderEntries, folderExists, folderName, listFolder } from './Folder.helpers.ts'

const file = (path, overrides = {}) => ({ path, title: null, mtimeMs: 100, size: 1, ...overrides })

const files = [
  file('README.md'),
  file('plans/openclaw/AGENTS.md'),
  file('plans/openclaw/README.md', { title: 'OpenClaw' }),
  file('plans/openclaw/trusted-plugin-state.md'),
  file('plans/openclaw/deep/index.md'),
  file('plans/agent-kit/proposal.md'),
]

describe('folderEntries', () => {
  it('prefers README, then AGENTS, then index, direct children only', () => {
    expect(folderEntries(files, 'plans/openclaw/')).toEqual([
      'plans/openclaw/README.md',
      'plans/openclaw/AGENTS.md',
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
      'plans/openclaw/',
      { 'plans/openclaw/README.md': 100, 'plans/openclaw/AGENTS.md': 50 },
      new Map([
        ['plans/openclaw/AGENTS.md', 2],
        ['plans/openclaw/deep/index.md', 1],
      ]),
    )
    expect(listing.folders).toEqual([
      { name: 'deep', path: 'plans/openclaw/deep/', files: 1, unread: 1, comments: 1 },
    ])
    expect(listing.files.map((f) => [f.name, f.status, f.comments, f.title])).toEqual([
      ['AGENTS.md', 'edited', 2, null],
      ['README.md', 'read', 0, 'OpenClaw'],
      ['trusted-plugin-state.md', 'unread', 0, null],
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
    expect(folderName('plans/openclaw/', 'docs')).toBe('openclaw')
    expect(folderName('', 'docs')).toBe('docs')
  })
})
