/**
 * Pure text rules behind selections and marks: snapping a selection to whole
 * words, and finding a quote again inside the rendered text, which the
 * browser splits across many text nodes.
 */

const WORD = /[\p{L}\p{N}_]/u

function isWord(char: string | undefined): boolean {
  return char !== undefined && WORD.test(char)
}

/** Moves a selection start back to the beginning of the word it cuts, then past leading spaces. */
export function snapStart(text: string, offset: number): number {
  let start = offset
  while (start > 0 && isWord(text[start - 1]) && isWord(text[start])) start--
  while (start < text.length && /\s/.test(text[start] ?? '')) start++
  return start
}

/** Moves a selection end forward to the end of the word it cuts, then before trailing spaces. */
export function snapEnd(text: string, offset: number): number {
  let end = offset
  while (end < text.length && isWord(text[end - 1]) && isWord(text[end])) end++
  while (end > 0 && /\s/.test(text[end - 1] ?? '')) end--
  return end
}

export interface TextPoint {
  segment: number
  offset: number
}

/**
 * Finds `quote` in text split into segments (one per text node), ignoring how
 * whitespace is laid out. Returns where it starts and ends (end exclusive), or
 * `null`. Case-sensitive first, then case-insensitive.
 */
export function locateInSegments(
  segments: string[],
  quote: string,
): { start: TextPoint; end: TextPoint } | null {
  const needle = quote.replace(/\s+/g, ' ').trim()
  if (!needle) return null

  // Collapse whitespace runs while remembering where every kept character came from.
  let joined = ''
  const origin: TextPoint[] = []
  segments.forEach((text, segment) => {
    for (let offset = 0; offset < text.length; offset++) {
      const char = text[offset] ?? ''
      if (/\s/.test(char)) {
        if (joined.endsWith(' ') || joined === '') continue
        joined += ' '
      } else {
        joined += char
      }
      origin.push({ segment, offset })
    }
  })

  let index = joined.indexOf(needle)
  if (index < 0) index = joined.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0) return null

  const first = origin[index]
  const last = origin[index + needle.length - 1]
  if (!first || !last) return null
  return { start: first, end: { segment: last.segment, offset: last.offset + 1 } }
}
