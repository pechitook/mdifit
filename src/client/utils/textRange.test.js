import { describe, expect, it } from 'vitest'
import { locateInSegments, snapEnd, snapStart } from './textRange.ts'

describe('snapStart / snapEnd', () => {
  const text = 'Redis también reintentó la publicación'

  it('extends a cut word to its start and end', () => {
    // "is también reintentó la publ" → "Redis también reintentó la publicación"
    expect(snapStart(text, 3)).toBe(0)
    expect(snapEnd(text, 31)).toBe(text.length)
  })

  it('leaves selections on word boundaries alone', () => {
    expect(snapStart(text, 6)).toBe(6)
    expect(snapEnd(text, 13)).toBe(13)
  })

  it('drops leading and trailing spaces', () => {
    expect(snapStart(text, 5)).toBe(6)
    expect(snapEnd(text, 14)).toBe(13)
  })

  it('handles accents and digits as word characters', () => {
    expect(snapEnd('versión 2026.10', 5)).toBe(7)
    expect(snapStart('run 42x', 5)).toBe(4)
  })
})

describe('locateInSegments', () => {
  const segments = [
    'El worker debe ',
    'confirmar',
    ' que el resultado\n  persiste en la cola de salida.',
  ]

  it('finds a quote across segments, ignoring line breaks and spacing', () => {
    expect(locateInSegments(segments, 'confirmar que el resultado persiste')).toEqual({
      start: { segment: 1, offset: 0 },
      end: { segment: 2, offset: 28 },
    })
  })

  it('finds it inside one segment', () => {
    expect(locateInSegments(segments, 'worker debe')).toEqual({
      start: { segment: 0, offset: 3 },
      end: { segment: 0, offset: 14 },
    })
  })

  it('falls back to a case-insensitive match', () => {
    expect(locateInSegments(segments, 'EL WORKER')?.start).toEqual({ segment: 0, offset: 0 })
  })

  it('returns null when the quote is gone or empty', () => {
    expect(locateInSegments(segments, 'not there')).toBeNull()
    expect(locateInSegments(segments, '  ')).toBeNull()
  })
})
