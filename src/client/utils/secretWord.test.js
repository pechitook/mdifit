import { describe, expect, it } from 'vitest'
import { NO_SECRET, WINDOW_MS, typeSecret } from './secretWord.ts'

function typeAll(keys, start = 1000, gap = 100) {
  let state = NO_SECRET
  return keys.split('').map((key, i) => {
    const step = typeSecret(state, key, start + i * gap)
    state = step.state
    return step
  })
}

describe('typeSecret', () => {
  it('matches boca, undoing the b and swallowing o, c and a', () => {
    const [b, o, c, a] = typeAll('boca')
    expect(b).toMatchObject({ consumed: false, undoFirst: false, matched: false })
    expect(o).toMatchObject({ consumed: true, undoFirst: true, matched: false })
    expect(c).toMatchObject({ consumed: true, undoFirst: false, matched: false })
    expect(a).toMatchObject({ consumed: true, matched: true })
    expect(a.state.typed).toBe('')
  })

  it('leaves a lone b or c to their shortcuts', () => {
    expect(typeAll('b')[0].consumed).toBe(false)
    expect(typeAll('c')[0].consumed).toBe(false)
  })

  it('starts over when the letters are too far apart', () => {
    const steps = typeAll('bo', 1000, WINDOW_MS + 1)
    expect(steps[1]).toMatchObject({ consumed: false, matched: false })
  })

  it('starts over on a wrong letter, and a b can begin a new attempt', () => {
    const steps = typeAll('bxboca')
    expect(steps[1].consumed).toBe(false)
    expect(steps.at(-1).matched).toBe(true)
  })

  it('does not match uppercase', () => {
    expect(typeAll('BOCA').some((s) => s.matched)).toBe(false)
  })
})
