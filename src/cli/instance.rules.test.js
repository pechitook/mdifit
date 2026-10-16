import { describe, expect, it } from 'vitest'
import { candidatePorts, decidePort, noFreePortMessage, planStart } from './instance.rules.ts'

describe('planStart', () => {
  it('starts on a free port', () => {
    expect(planStart({ kind: 'free' }, '/docs', 1905)).toEqual({ kind: 'start' })
  })

  it('reuses an instance serving the same target', () => {
    expect(planStart({ kind: 'mdifit', target: '/docs' }, '/docs', 1905)).toEqual({
      kind: 'reuse',
    })
  })

  it('explains a conflict on an explicit port with another target or program', () => {
    const other = planStart({ kind: 'mdifit', target: '/plans' }, '/docs', 1905)
    expect(other.kind).toBe('conflict')
    expect(other.message).toContain('/plans')

    const foreign = planStart({ kind: 'other' }, '/docs', 1905)
    expect(foreign).toEqual({
      kind: 'conflict',
      message: 'Port 1905 is taken by another program. Pass another --port, or leave it out.',
    })
  })
})

describe('candidatePorts', () => {
  it('tries 1905 and the next ports', () => {
    expect(candidatePorts(null, 1905, 3)).toEqual([1905, 1906, 1907])
  })

  it('tries the remembered port first, without repeating it', () => {
    expect(candidatePorts(1906, 1905, 3)).toEqual([1906, 1905, 1907])
    expect(candidatePorts(5000, 1905, 2)).toEqual([5000, 1905, 1906])
  })
})

describe('decidePort', () => {
  it('starts on a free port, reuses this folder, skips anything else', () => {
    expect(decidePort({ kind: 'free' }, '/docs')).toBe('start')
    expect(decidePort({ kind: 'mdifit', target: '/docs' }, '/docs')).toBe('reuse')
    expect(decidePort({ kind: 'mdifit', target: '/plans' }, '/docs')).toBe('skip')
    expect(decidePort({ kind: 'other' }, '/docs')).toBe('skip')
  })
})

describe('noFreePortMessage', () => {
  it('names the range it tried', () => {
    expect(noFreePortMessage([1905, 1906, 1924])).toBe(
      'Ports 1905–1924 are all taken. Stop another mdifit or pass --port.',
    )
  })
})
