import type { SearchHit, WorkspaceFile } from '../../../shared/api.ts'
import { normalize } from '../../utils/text.ts'

/**
 * ⌘K: files match locally as you type; headings and text come from the
 * server. Results keep that order: files, headings, text. Files are listed
 * newest first, so recent plans and guides surface without a query.
 */

export type PaletteKind = 'file' | 'heading' | 'text'

export interface PaletteItem {
  key: string
  kind: PaletteKind
  path: string
  /** Line to scroll to, `null` to open the file at the top. */
  line: number | null
  label: string
  detail: string
  /** Last modified, for files; `null` for headings and text. */
  mtimeMs: number | null
}

export const FILE_LIMIT = 8
/**
 * A file must score at least this share of the best match to be listed. Above
 * it, newer files go first; below it, a loose subsequence would bury the file
 * you meant under whatever changed last.
 */
export const RELEVANCE = 0.7

/**
 * Subsequence score: every query character must appear in order. Consecutive
 * matches and matches in the file name score higher. `null` when no match.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = normalize(query.replace(/\s+/g, ''))
  const t = normalize(target)
  if (!q) return 0
  const nameStart = t.lastIndexOf('/') + 1
  let score = 0
  let previous = -2
  let index = 0
  for (const char of q) {
    const found = t.indexOf(char, index)
    if (found < 0) return null
    score += 1
    if (found === previous + 1) score += 3
    if (found >= nameStart) score += 2
    if (found === nameStart || t[found - 1] === '-' || t[found - 1] === '_') score += 2
    previous = found
    index = found + 1
  }
  // Shorter paths win ties.
  return score - t.length / 100
}

/** Files matching the query (all of them for an empty one), newest first. */
export function matchFiles(files: WorkspaceFile[], query: string): PaletteItem[] {
  const scored = files
    .map((file) => ({ file, score: fuzzyScore(query, file.path) }))
    .filter((entry): entry is { file: WorkspaceFile; score: number } => entry.score !== null)
  const best = Math.max(0, ...scored.map((entry) => entry.score))
  return scored
    .filter((entry) => entry.score >= best * RELEVANCE)
    .toSorted((a, b) => b.file.mtimeMs - a.file.mtimeMs || b.score - a.score)
    .slice(0, FILE_LIMIT)
    .map(({ file }) => ({
      key: `file:${file.path}`,
      kind: 'file',
      path: file.path,
      line: null,
      label: file.path,
      detail: file.title ?? '',
      mtimeMs: file.mtimeMs,
    }))
}

export function hitItems(hits: SearchHit[]): PaletteItem[] {
  return hits.map((hit) => ({
    key: `${hit.kind}:${hit.path}:${hit.line}`,
    kind: hit.kind,
    path: hit.path,
    line: hit.line,
    label: hit.kind === 'heading' ? `${'#'.repeat(hit.level ?? 1)} ${hit.text}` : hit.text,
    detail: `${hit.path}:L${hit.line}`,
    mtimeMs: null,
  }))
}

/** Splits a label around the query so the match can be emphasized. */
export function highlightParts(label: string, query: string): { text: string; match: boolean }[] {
  const needle = normalize(query.trim())
  const index = needle ? normalize(label).indexOf(needle) : -1
  if (index < 0) return [{ text: label, match: false }]
  return [
    { text: label.slice(0, index), match: false },
    { text: label.slice(index, index + needle.length), match: true },
    { text: label.slice(index + needle.length), match: false },
  ].filter((part) => part.text)
}
