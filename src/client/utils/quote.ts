/**
 * A selection in the rendered view only knows its block (`L3-L9`). These rules
 * find the source lines that actually hold the selected text, so a comment on
 * one sentence of a long paragraph points at that sentence's line.
 */

export interface LineRange {
  startLine: number
  endLine: number
}

/** Words used to find where a quote starts and ends in the source. */
const PROBE_WORDS = 4

export function locateQuote(sourceLines: string[], block: LineRange, quote: string): LineRange {
  const needle = plain(quote)
  if (!needle) return block

  // Join the block into one string, remembering where each line starts, so a
  // quote that wraps across source lines is found like any other.
  const offsets: { line: number; start: number }[] = []
  let joined = ''
  for (let line = block.startLine; line <= block.endLine; line++) {
    const text = plain(sourceLines[line - 1] ?? '')
    if (!text) continue
    if (joined) joined += ' '
    offsets.push({ line, start: joined.length })
    joined += text
  }

  let from = joined.indexOf(needle)
  let to = from + needle.length
  if (from < 0) {
    // Rendered text can differ from the source (smart quotes, entities):
    // fall back to the first and last few words.
    const words = needle.split(' ')
    from = joined.indexOf(words.slice(0, PROBE_WORDS).join(' '))
    const tail = words.slice(-PROBE_WORDS).join(' ')
    const tailAt = from < 0 ? -1 : joined.indexOf(tail, from)
    if (from < 0) return block
    to = tailAt < 0 ? from + 1 : tailAt + tail.length
  }

  return { startLine: lineAt(offsets, from), endLine: lineAt(offsets, to - 1) }
}

function lineAt(offsets: { line: number; start: number }[], index: number): number {
  let line = offsets[0]?.line ?? 1
  for (const offset of offsets) {
    if (offset.start > index) break
    line = offset.line
  }
  return line
}

/**
 * Text as a reader sees it: Markdown markup removed, whitespace collapsed,
 * lowercased. Applied to both the quote and the source before comparing.
 */
export function plain(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/gm, '')
    .replace(/[*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}
