import { describe, expect, it } from 'vitest'
import { buildPrompt, formatComment, formatLocation } from './prompt.ts'

const options = { promptBase: 'plans/', includeQuotes: true }

const comment = (overrides) => ({
  id: 'c',
  path: 'release.md',
  startLine: 14,
  endLine: 14,
  quote: null,
  body: 'Add a rollback criterion.',
  suggestion: null,
  createdAt: 1,
  ...overrides,
})

describe('formatLocation', () => {
  it('uses one line or a range, relative to where the CLI started', () => {
    expect(formatLocation(comment(), 'plans/')).toBe('plans/release.md:L14')
    expect(formatLocation(comment({ endLine: 16 }), '')).toBe('release.md:L14-L16')
  })
})

describe('formatComment', () => {
  it('is location plus feedback, like difit', () => {
    expect(formatComment(comment(), options)).toBe(
      'plans/release.md:L14\nAdd a rollback criterion.',
    )
  })

  it('quotes the selection when asked', () => {
    const c = comment({ quote: 'move emails first\nand payments last' })
    expect(formatComment(c, options)).toBe(
      'plans/release.md:L14\n> move emails first\n> and payments last\nAdd a rollback criterion.',
    )
    expect(formatComment(c, { ...options, includeQuotes: false })).toBe(
      'plans/release.md:L14\nAdd a rollback criterion.',
    )
  })

  it('writes suggested edits as ORIGINAL / SUGGESTED blocks', () => {
    const c = comment({
      startLine: 47,
      endLine: 47,
      quote: '50 messages per second',
      suggestion: '20 messages per second',
      body: '',
    })
    expect(formatComment(c, options)).toBe(
      [
        'plans/release.md:L47',
        'ORIGINAL:',
        '```',
        '50 messages per second',
        '```',
        'SUGGESTED:',
        '```',
        '20 messages per second',
        '```',
      ].join('\n'),
    )
  })

  it('uses a longer fence when the text holds backticks', () => {
    const c = comment({ quote: 'run ```x```', suggestion: 'y', body: '' })
    expect(formatComment(c, options)).toContain('````\nrun ```x```\n````')
  })
})

describe('buildPrompt', () => {
  it('sorts by file and line and separates comments like difit', () => {
    const prompt = buildPrompt(
      [
        comment({ id: '2', startLine: 30, endLine: 30, body: 'Second' }),
        comment({ id: '1', startLine: 3, endLine: 3, body: 'First' }),
      ],
      options,
    )
    expect(prompt).toBe('plans/release.md:L3\nFirst\n=====\nplans/release.md:L30\nSecond')
  })

  it('is empty without comments', () => {
    expect(buildPrompt([], options)).toBe('')
  })
})
