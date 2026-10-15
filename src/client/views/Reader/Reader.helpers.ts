import type { ReviewComment } from '../../stores/review.helpers.ts'

/**
 * Rules for the reader: where comments and the composer go between blocks,
 * how a draft becomes a comment, and how source lines are colored.
 */

export interface LineSpan {
  key: string
  startLine: number
  endLine: number
}

export type DraftMode = 'comment' | 'suggest'

/** A comment being written or edited, shown inline under its lines. */
export interface Draft {
  mode: DraftMode
  startLine: number
  endLine: number
  quote: string | null
  body: string
  suggestion: string
  /** Set when editing an existing comment. */
  editingId: string | null
}

/**
 * Groups items under the block they belong after: the last block that starts
 * at or before the item's last line. Items above the first block (front
 * matter) go under the first one, so nothing is ever lost.
 */
export function placeAfterBlocks<T extends { endLine: number }>(
  blocks: LineSpan[],
  items: T[],
): Map<string, T[]> {
  const placed = new Map<string, T[]>()
  const first = blocks[0]
  if (!first) return placed
  for (const item of items) {
    let target = first
    for (const block of blocks) {
      if (block.startLine <= item.endLine) target = block
      else break
    }
    placed.set(target.key, [...(placed.get(target.key) ?? []), item])
  }
  return placed
}

/** The block that holds a source line, or the nearest one above it. */
export function blockAtLine(blocks: LineSpan[], line: number): LineSpan | null {
  let found: LineSpan | null = null
  for (const block of blocks) {
    if (block.startLine <= line) found = block
    else break
  }
  return found ?? blocks[0] ?? null
}

/** The text a suggestion replaces: the quote, or the raw lines when there is none. */
export function originalText(
  draft: Pick<Draft, 'quote' | 'startLine' | 'endLine'>,
  lines: string[],
): string {
  return draft.quote ?? lines.slice(draft.startLine - 1, draft.endLine).join('\n')
}

export function newDraft(
  mode: DraftMode,
  range: { startLine: number; endLine: number; quote: string | null },
  lines: string[],
): Draft {
  const draft: Draft = { mode, ...range, body: '', suggestion: '', editingId: null }
  if (mode === 'suggest') draft.suggestion = originalText(draft, lines)
  return draft
}

export function draftFromComment(comment: ReviewComment): Draft {
  return {
    mode: comment.suggestion === null ? 'comment' : 'suggest',
    startLine: comment.startLine,
    endLine: comment.endLine,
    quote: comment.quote,
    body: comment.body,
    suggestion: comment.suggestion ?? '',
    editingId: comment.id,
  }
}

/** Switches a draft between comment and suggestion without losing what was typed. */
export function switchMode(draft: Draft, mode: DraftMode, lines: string[]): Draft {
  if (draft.mode === mode) return draft
  const suggestion =
    mode === 'suggest' && !draft.suggestion ? originalText(draft, lines) : draft.suggestion
  return { ...draft, mode, suggestion }
}

/** What a draft saves as, or `null` while there is nothing to save. */
export function draftToComment(
  draft: Draft,
  path: string,
  lines: string[],
): Omit<ReviewComment, 'id' | 'createdAt'> | null {
  const body = draft.body.trim()
  if (draft.mode === 'suggest') {
    const quote = originalText(draft, lines)
    if (draft.suggestion === quote && !body) return null
    return {
      path,
      startLine: draft.startLine,
      endLine: draft.endLine,
      quote,
      body,
      suggestion: draft.suggestion,
    }
  }
  if (!body) return null
  return {
    path,
    startLine: draft.startLine,
    endLine: draft.endLine,
    quote: draft.quote,
    body,
    suggestion: null,
  }
}

export type SourceLineKind = 'heading' | 'quote' | 'list' | 'fence' | 'code' | 'meta' | 'text'

/** A light Markdown coloring for the source view, line by line. */
export function classifySourceLines(lines: string[]): SourceLineKind[] {
  const kinds: SourceLineKind[] = []
  let fence: string | null = null
  let frontMatter = lines[0]?.trim() === '---'

  lines.forEach((line, index) => {
    if (frontMatter) {
      kinds.push('meta')
      if (index > 0 && line.trim() === '---') frontMatter = false
      return
    }
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceMatch?.[1]) {
      const marker = fenceMatch[1].charAt(0)
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      kinds.push('fence')
      return
    }
    if (fence !== null) kinds.push('code')
    else if (/^\s{0,3}#{1,6}\s/.test(line)) kinds.push('heading')
    else if (/^\s{0,3}>/.test(line)) kinds.push('quote')
    else if (/^\s*([-*+]|\d+[.)])\s/.test(line)) kinds.push('list')
    else kinds.push('text')
  })
  return kinds
}

// --- margin layout (Read view) ---------------------------------------------------

export interface Marker {
  id: string
  /** Top of the commented text, relative to the page. */
  top: number
}

/** Bubbles keep their line but never overlap: a crowded one moves just below the previous. */
export function stackMarkers(markers: Marker[], size: number, gap = 4): Marker[] {
  const placed: Marker[] = []
  for (const marker of markers.toSorted((a, b) => a.top - b.top)) {
    const previous = placed.at(-1)
    const top = previous ? Math.max(marker.top, previous.top + size + gap) : marker.top
    placed.push({ id: marker.id, top })
  }
  return placed
}

export interface PopoverPlacement {
  top: number
  left: number
  /** `margin`: beside the text. `below`: over the text, under the anchor. */
  side: 'margin' | 'below'
}

export interface PopoverInput {
  /** Commented text, relative to the page. */
  anchor: { top: number; bottom: number }
  /** Width of the page (text column plus its gutters). */
  pageWidth: number
  /** Free space to the right of the page inside the reader. */
  marginSpace: number
  /** Right gutter of the page, where the bubbles sit. */
  gutter: number
  width: number
}

/**
 * Beside the text when the window has room for it (starting just past the
 * bubbles, inside the page's right gutter), otherwise under the anchor line.
 */
export function placePopover(input: PopoverInput): PopoverPlacement {
  if (input.marginSpace >= input.width) {
    return { side: 'margin', top: Math.max(0, input.anchor.top - 10), left: input.pageWidth - 14 }
  }
  return {
    side: 'below',
    top: input.anchor.bottom + 10,
    left: Math.max(0, input.pageWidth - input.gutter - input.width),
  }
}

/** Comments of a file in reading order, for previous / next. */
export function readingOrder<T extends { id: string; startLine: number; createdAt: number }>(
  comments: T[],
): T[] {
  return comments.toSorted((a, b) => a.startLine - b.startLine || a.createdAt - b.createdAt)
}

export function linesLabel(range: { startLine: number; endLine: number }): string {
  return range.startLine === range.endLine
    ? `Line ${range.startLine}`
    : `Lines ${range.startLine}–${range.endLine}`
}
