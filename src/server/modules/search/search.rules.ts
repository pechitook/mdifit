import type { SearchHit } from '../../../shared/api.ts'

/** Pure full-text search over Markdown sources: headings first, then text lines. */

export interface SearchDoc {
  path: string
  source: string
}

export interface Heading {
  level: number
  text: string
  /** 1-based source line. */
  line: number
}

export const LIMITS = { heading: 12, text: 30 } as const

/** Lowercase and strip diacritics, so `reconciliacion` finds `reconciliación`. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** ATX headings outside code fences and front matter. */
export function extractHeadings(source: string): Heading[] {
  const headings: Heading[] = []
  forEachProseLine(source, (line, lineNumber) => {
    const match = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (match?.[1] && match[2]) {
      headings.push({ level: match[1].length, text: match[2], line: lineNumber })
    }
  })
  return headings
}

export function searchDocs(docs: SearchDoc[], query: string): SearchHit[] {
  const needle = normalize(query.trim())
  if (needle.length < 2) return []

  const headings: SearchHit[] = []
  const text: SearchHit[] = []

  for (const doc of docs) {
    const headingLines = new Set<number>()
    for (const heading of extractHeadings(doc.source)) {
      headingLines.add(heading.line)
      if (headings.length < LIMITS.heading && normalize(heading.text).includes(needle)) {
        headings.push({
          kind: 'heading',
          path: doc.path,
          line: heading.line,
          text: heading.text,
          level: heading.level,
        })
      }
    }

    if (text.length >= LIMITS.text) continue
    forEachProseLine(doc.source, (line, lineNumber) => {
      if (text.length >= LIMITS.text || headingLines.has(lineNumber)) return
      if (normalize(line).includes(needle)) {
        text.push({
          kind: 'text',
          path: doc.path,
          line: lineNumber,
          text: snippet(line, needle),
          level: null,
        })
      }
    })
  }

  return [...headings, ...text]
}

/** A window of the line around the first match, so long paragraphs stay readable. */
export function snippet(line: string, needle: string, radius = 60): string {
  const trimmed = line.trim()
  const index = normalize(trimmed).indexOf(needle)
  if (index < 0 || trimmed.length <= radius * 2) return trimmed
  const start = Math.max(0, index - radius)
  const end = Math.min(trimmed.length, index + needle.length + radius)
  return `${start > 0 ? '…' : ''}${trimmed.slice(start, end).trim()}${end < trimmed.length ? '…' : ''}`
}

function forEachProseLine(source: string, visit: (line: string, lineNumber: number) => void): void {
  const lines = source.split(/\r?\n/)
  let fence: string | null = null
  let start = 0

  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
    if (end > 0) start = end + 1
  }

  for (let i = start; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceMatch?.[1]) {
      const marker = fenceMatch[1].charAt(0)
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence === null) visit(line, i + 1)
  }
}
