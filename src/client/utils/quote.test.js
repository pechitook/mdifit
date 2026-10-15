import { describe, expect, it } from 'vitest'
import { locateQuote, plain } from './quote.ts'

const source = [
  '# Plan', //                                                                1
  '', //                                                                      2
  'An outbox table in the orders database, a relay that publishes it and', // 3
  'one consumer group per side effect. Migrate the current side effects;', // 4
  '**move email confirmations first** and payment capture last, once', //    5
  'retries are proven on [staging](staging.md).', //                         6
]
const paragraph = { startLine: 3, endLine: 6 }

describe('locateQuote', () => {
  it('narrows a one-line quote to its line, ignoring inline markup', () => {
    expect(
      locateQuote(source, paragraph, 'move email confirmations first and payment capture last'),
    ).toEqual({ startLine: 5, endLine: 5 })
  })

  it('spans the lines a wrapped quote covers', () => {
    expect(
      locateQuote(source, paragraph, 'Migrate the current side effects; move email confirmations'),
    ).toEqual({ startLine: 4, endLine: 5 })
  })

  it('matches link text, not the URL', () => {
    expect(locateQuote(source, paragraph, 'retries are proven on staging')).toEqual({
      startLine: 6,
      endLine: 6,
    })
  })

  it('keeps the block when the quote cannot be found', () => {
    expect(locateQuote(source, paragraph, 'something else entirely')).toEqual(paragraph)
    expect(locateQuote(source, paragraph, '   ')).toEqual(paragraph)
  })
})

describe('plain', () => {
  it('strips Markdown markup and collapses whitespace', () => {
    expect(plain('## A **bold** `code` [link](x.md)')).toBe('a bold code link')
    expect(plain('- [x] Done   item')).toBe('done item')
    expect(plain('> quoted\n> text')).toBe('quoted text')
  })
})
