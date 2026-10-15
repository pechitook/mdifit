import type { ReviewComment } from '../stores/review.helpers.ts'
import { sortComments } from '../stores/review.helpers.ts'

/**
 * The prompt format is difit's, so both tools paste the same way into an
 * agent: `path:L12` (or `path:L12-L14`) on its own line, then the feedback,
 * comments separated by `=====`. Suggested edits use ORIGINAL / SUGGESTED.
 */

export interface PromptOptions {
  /** Prefix that makes workspace paths relative to where the CLI started. */
  promptBase: string
  /** Quote the selected text under the location. */
  includeQuotes: boolean
}

export const SEPARATOR = '\n=====\n'

export function formatLocation(comment: ReviewComment, promptBase: string): string {
  const lines =
    comment.startLine === comment.endLine
      ? `L${comment.startLine}`
      : `L${comment.startLine}-L${comment.endLine}`
  return `${promptBase}${comment.path}:${lines}`
}

export function formatComment(comment: ReviewComment, options: PromptOptions): string {
  const parts = [formatLocation(comment, options.promptBase)]

  if (comment.suggestion !== null) {
    parts.push(fence('ORIGINAL', comment.quote ?? ''), fence('SUGGESTED', comment.suggestion))
  } else if (options.includeQuotes && comment.quote) {
    parts.push(quoteLines(comment.quote))
  }

  const body = comment.body.trim()
  if (body) parts.push(body)
  return parts.join('\n')
}

export function buildPrompt(comments: ReviewComment[], options: PromptOptions): string {
  return sortComments(comments)
    .map((comment) => formatComment(comment, options))
    .join(SEPARATOR)
}

function quoteLines(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => `> ${line.trim()}`.trimEnd())
    .join('\n')
}

function fence(label: string, text: string): string {
  // A longer fence than any backtick run inside keeps the block intact.
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length))
  const ticks = '`'.repeat(longest + 1)
  return `${label}:\n${ticks}\n${text}\n${ticks}`
}
