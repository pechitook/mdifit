import { describe, expect, it } from 'vitest'
import { cacheKey, errorSummary } from './mermaid.ts'

describe('cacheKey', () => {
  it('separates themes and sources', () => {
    expect(cacheKey('dark', 'A-->B')).not.toBe(cacheKey('light', 'A-->B'))
    expect(cacheKey('dark', 'A-->B')).not.toBe(cacheKey('dark', 'A-->C'))
  })
})

describe('errorSummary', () => {
  it('keeps the first meaningful line of a Mermaid error', () => {
    const error = new Error('\nParse error on line 3:\n...A --> \n-------^\nExpecting NODE_STRING')
    expect(errorSummary(error)).toBe('Parse error on line 3')
  })

  it('handles non-Error values and empty messages', () => {
    expect(errorSummary('No diagram type detected')).toBe('No diagram type detected')
    expect(errorSummary(new Error(''))).toBe('Invalid diagram')
  })
})
