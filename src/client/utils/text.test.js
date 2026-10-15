import { describe, expect, it } from 'vitest'
import { formatAge, normalize, pluralize } from './text.ts'

describe('normalize', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalize('Reconciliación')).toBe('reconciliacion')
  })
})

describe('pluralize', () => {
  it('picks the form by count', () => {
    expect(pluralize(1, 'comment')).toBe('1 comment')
    expect(pluralize(3, 'comment')).toBe('3 comments')
    expect(pluralize(0, 'match', 'matches')).toBe('0 matches')
  })
})

describe('formatAge', () => {
  const now = Date.UTC(2026, 9, 15, 12)
  it('reads like a person would say it', () => {
    expect(formatAge(now - 10_000, now)).toBe('just now')
    expect(formatAge(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(formatAge(now - 3 * 3_600_000, now)).toBe('3 h ago')
    expect(formatAge(now - 2 * 86_400_000, now)).toBe('2 d ago')
    expect(formatAge(Date.UTC(2026, 0, 2), now)).toBe('2026-01-02')
  })
})
