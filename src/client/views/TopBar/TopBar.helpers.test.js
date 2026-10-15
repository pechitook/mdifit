import { describe, expect, it } from 'vitest'
import { breadcrumbs } from './TopBar.helpers.ts'

describe('breadcrumbs', () => {
  it('walks from the root to the file', () => {
    expect(breadcrumbs('plans', null, 'queue/AGENTS.md')).toEqual([
      { label: 'plans', path: '', current: false },
      { label: 'queue', path: 'queue/', current: false },
      { label: 'AGENTS.md', path: 'queue/AGENTS.md', current: true },
    ])
  })

  it('ends at the README a folder opened with', () => {
    expect(breadcrumbs('plans', 'queue/', 'queue/README.md').map((c) => c.label)).toEqual([
      'plans',
      'queue',
      'README.md',
    ])
  })

  it('ends at the folder when it has no README', () => {
    expect(breadcrumbs('plans', 'a/b/', null)).toEqual([
      { label: 'plans', path: '', current: false },
      { label: 'a', path: 'a/', current: false },
      { label: 'b', path: 'a/b/', current: true },
    ])
  })

  it('is just the root on the root folder', () => {
    expect(breadcrumbs('plans', '', null)).toEqual([{ label: 'plans', path: '', current: true }])
  })
})
