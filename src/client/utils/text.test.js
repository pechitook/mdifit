import { describe, expect, it } from 'vitest'
import { normalize, pluralize } from './text.ts'

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
