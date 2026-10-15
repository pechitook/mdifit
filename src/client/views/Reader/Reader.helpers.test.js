import { describe, expect, it } from 'vitest'
import {
  blockAtLine,
  classifySourceLines,
  draftFromComment,
  draftToComment,
  newDraft,
  originalText,
  placeAfterBlocks,
  switchMode,
} from './Reader.helpers.ts'

const blocks = [
  { key: 'h', startLine: 4, endLine: 4 },
  { key: 'p', startLine: 6, endLine: 9 },
  { key: 't', startLine: 11, endLine: 15 },
]

const lines = ['---', 'a: 1', '---', '# Title', '', 'one', 'two', 'three', 'four']

describe('placeAfterBlocks', () => {
  it('puts each item after the block holding its last line', () => {
    const placed = placeAfterBlocks(blocks, [
      { id: 'a', endLine: 7 },
      { id: 'b', endLine: 10 },
      { id: 'c', endLine: 40 },
    ])
    expect(placed.get('p').map((i) => i.id)).toEqual(['a', 'b'])
    expect(placed.get('t').map((i) => i.id)).toEqual(['c'])
  })

  it('keeps items above the first block under the first block', () => {
    const placed = placeAfterBlocks(blocks, [{ id: 'fm', endLine: 2 }])
    expect(placed.get('h').map((i) => i.id)).toEqual(['fm'])
  })

  it('is empty without blocks', () => {
    expect(placeAfterBlocks([], [{ endLine: 1 }]).size).toBe(0)
  })
})

describe('blockAtLine', () => {
  it('finds the block holding the line or the nearest above', () => {
    expect(blockAtLine(blocks, 7).key).toBe('p')
    expect(blockAtLine(blocks, 10).key).toBe('p')
    expect(blockAtLine(blocks, 1).key).toBe('h')
    expect(blockAtLine([], 1)).toBeNull()
  })
})

describe('drafts', () => {
  it('suggests from the quote, or from the raw lines without one', () => {
    expect(originalText({ quote: 'two', startLine: 6, endLine: 9 }, lines)).toBe('two')
    expect(originalText({ quote: null, startLine: 6, endLine: 7 }, lines)).toBe('one\ntwo')
    expect(newDraft('suggest', { startLine: 6, endLine: 6, quote: null }, lines).suggestion).toBe(
      'one',
    )
    expect(newDraft('comment', { startLine: 6, endLine: 6, quote: null }, lines).suggestion).toBe(
      '',
    )
  })

  it('switches mode keeping what was typed', () => {
    const draft = {
      ...newDraft('comment', { startLine: 6, endLine: 6, quote: 'one' }, lines),
      body: 'why',
    }
    const suggest = switchMode(draft, 'suggest', lines)
    expect(suggest).toMatchObject({ mode: 'suggest', body: 'why', suggestion: 'one' })
    expect(switchMode(suggest, 'comment', lines)).toMatchObject({ mode: 'comment', body: 'why' })
  })

  it('saves comments with a body and suggestions that change something', () => {
    const comment = {
      ...newDraft('comment', { startLine: 6, endLine: 7, quote: 'one two' }, lines),
      body: ' Fix ',
    }
    expect(draftToComment(comment, 'a.md', lines)).toEqual({
      path: 'a.md',
      startLine: 6,
      endLine: 7,
      quote: 'one two',
      body: 'Fix',
      suggestion: null,
    })
    expect(draftToComment({ ...comment, body: '  ' }, 'a.md', lines)).toBeNull()

    const suggest = newDraft('suggest', { startLine: 6, endLine: 6, quote: null }, lines)
    expect(draftToComment(suggest, 'a.md', lines)).toBeNull()
    expect(draftToComment({ ...suggest, suggestion: 'uno' }, 'a.md', lines)).toMatchObject({
      quote: 'one',
      suggestion: 'uno',
      body: '',
    })
  })

  it('edits an existing comment', () => {
    const draft = draftFromComment({
      id: 'x',
      path: 'a.md',
      startLine: 6,
      endLine: 6,
      quote: 'one',
      body: '',
      suggestion: 'uno',
      createdAt: 1,
    })
    expect(draft).toEqual({
      mode: 'suggest',
      startLine: 6,
      endLine: 6,
      quote: 'one',
      body: '',
      suggestion: 'uno',
      editingId: 'x',
    })
  })
})

describe('classifySourceLines', () => {
  it('colors front matter, headings, quotes, lists and code', () => {
    expect(
      classifySourceLines([
        '---',
        'a: 1',
        '---',
        '# H',
        '> q',
        '- item',
        '```',
        '# not',
        '```',
        'text',
      ]),
    ).toEqual([
      'meta',
      'meta',
      'meta',
      'heading',
      'quote',
      'list',
      'fence',
      'code',
      'fence',
      'text',
    ])
  })
})
