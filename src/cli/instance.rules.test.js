import { describe, expect, it } from 'vitest'
import { planStart } from './instance.rules.ts'

describe('planStart', () => {
  it('starts on a free port', () => {
    expect(planStart({ kind: 'free' }, '/docs', 47613)).toEqual({ kind: 'start' })
  })

  it('reuses an instance serving the same target', () => {
    expect(planStart({ kind: 'mdifit', target: '/docs' }, '/docs', 47613)).toEqual({
      kind: 'reuse',
    })
  })

  it('explains a conflict with another target or program', () => {
    const other = planStart({ kind: 'mdifit', target: '/plans' }, '/docs', 47613)
    expect(other.kind).toBe('conflict')
    expect(other.message).toContain('/plans')

    const foreign = planStart({ kind: 'other' }, '/docs', 47613)
    expect(foreign).toEqual({
      kind: 'conflict',
      message: 'Port 47613 is taken by another program. Free it or pass --port.',
    })
  })
})
