import { describe, expect, it } from 'vitest'
import { locateQuote, plain } from './quote.ts'

const source = [
  '# Plan', //                                                          1
  '', //                                                                2
  'Shared backend in Synapse, an admin command in devscripts and a', // 3
  'short contract in agent-kit. Version the nine current guides;', //   4
  '**enable the reconciliation mechanism** first on GrokBot and', //    5
  'check it afterwards on [Dot](dot.md).', //                          6
]
const paragraph = { startLine: 3, endLine: 6 }

describe('locateQuote', () => {
  it('narrows a one-line quote to its line, ignoring inline markup', () => {
    expect(
      locateQuote(source, paragraph, 'enable the reconciliation mechanism first on GrokBot'),
    ).toEqual({ startLine: 5, endLine: 5 })
  })

  it('spans the lines a wrapped quote covers', () => {
    expect(
      locateQuote(source, paragraph, 'Version the nine current guides; enable the reconciliation'),
    ).toEqual({ startLine: 4, endLine: 5 })
  })

  it('matches link text, not the URL', () => {
    expect(locateQuote(source, paragraph, 'check it afterwards on Dot')).toEqual({
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
