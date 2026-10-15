import { locateInSegments } from '../../utils/textRange.ts'

/**
 * Browser-only helpers for the Read view's marks. Comments are painted with
 * the CSS Custom Highlight API, so the rendered Markdown is never rewritten to
 * underline a phrase. Browsers without it still get the bubbles.
 */

export type HighlightName =
  | 'mdifit-comment'
  | 'mdifit-suggest'
  | 'mdifit-active'
  | 'mdifit-pending'
  | 'mdifit-del'

const NAMES: HighlightName[] = [
  'mdifit-comment',
  'mdifit-suggest',
  'mdifit-active',
  'mdifit-pending',
  'mdifit-del',
]

export function paint(name: HighlightName, ranges: Range[]): void {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return
  if (ranges.length === 0) CSS.highlights.delete(name)
  else CSS.highlights.set(name, new Highlight(...ranges))
}

export function clearPaint(): void {
  for (const name of NAMES) paint(name, [])
}

/** The rendered block holding a source line, or the nearest one above it. */
export function blockElement(page: HTMLElement, line: number): HTMLElement | null {
  let found: HTMLElement | null = null
  for (const block of page.querySelectorAll<HTMLElement>('.block')) {
    if (Number(block.dataset.lineStart) <= line) found = block
    else break
  }
  return found ?? page.querySelector<HTMLElement>('.block')
}

/** Where a comment's quote is in the rendered text of the blocks its lines cover. */
export function findQuoteRange(
  page: HTMLElement,
  comment: { startLine: number; endLine: number; quote: string | null },
): Range | null {
  if (!comment.quote) return null
  const nodes = textNodes(page, comment.startLine, comment.endLine)
  const found = locateInSegments(
    nodes.map((node) => node.data),
    comment.quote,
  )
  const start = found ? nodes[found.start.segment] : undefined
  const end = found ? nodes[found.end.segment] : undefined
  if (!found || !start || !end) return null
  const range = document.createRange()
  range.setStart(start, found.start.offset)
  range.setEnd(end, found.end.offset)
  return range
}

/** Vertical extent of a range or element, relative to the page. */
export function boxWithin(
  page: HTMLElement,
  target: Range | Element,
): { top: number; bottom: number } {
  const origin = page.getBoundingClientRect()
  const rects = target instanceof Range ? target.getClientRects() : [target.getBoundingClientRect()]
  const first = rects[0] ?? target.getBoundingClientRect()
  const last = rects[rects.length - 1] ?? first
  return { top: first.top - origin.top, bottom: last.bottom - origin.top }
}

export function isLive(range: Range | null): range is Range {
  return range !== null && range.startContainer.isConnected && !range.collapsed
}

/** Shows a suggested replacement right after the text it replaces. */
export function insertPreview(range: Range, text: string): HTMLElement {
  const preview = document.createElement('ins')
  preview.className = 'mdifit-preview'
  preview.textContent = ` ${text}`
  const at = range.cloneRange()
  at.collapse(false)
  at.insertNode(preview)
  return preview
}

export function removePreview(preview: HTMLElement | null): void {
  if (!preview) return
  const parent = preview.parentNode
  preview.remove()
  // Merge the text node the insertion split, so later quote searches see one node.
  parent?.normalize()
}

function textNodes(page: HTMLElement, startLine: number, endLine: number): Text[] {
  const nodes: Text[] = []
  for (const block of page.querySelectorAll<HTMLElement>('.block')) {
    const from = Number(block.dataset.lineStart)
    const to = Number(block.dataset.lineEnd)
    if (to < startLine || from > endLine) continue
    for (const doc of block.querySelectorAll('[data-doc]')) {
      const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.parentElement?.closest('.mdifit-preview')) nodes.push(node as Text)
      }
    }
  }
  return nodes
}
