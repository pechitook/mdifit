import type { WorkspaceFile } from '../../shared/api.ts'

/**
 * Comments and reading progress, kept in the browser's localStorage per
 * workspace root. Pure: parsing, updates and derived counts.
 */

export interface ReviewComment {
  id: string
  /** Workspace path of the file. */
  path: string
  /** 1-based, inclusive source lines. */
  startLine: number
  endLine: number
  /** Selected text, when the comment came from a selection. */
  quote: string | null
  /** Free text. May be empty on a suggestion. */
  body: string
  /** Replacement for `quote`: set only on suggested edits. */
  suggestion: string | null
  createdAt: number
}

export interface ReviewState {
  comments: ReviewComment[]
  /** Workspace path → file mtime when it was marked read. */
  read: Record<string, number>
}

export type ReadStatus = 'unread' | 'read' | 'edited'

/** UI preferences shared by every workspace. */
export interface Prefs {
  mode: 'read' | 'source'
  includeQuotes: boolean
  /** Files sidebar on the left. */
  showFiles: boolean
  /** Comments rail on the right. */
  showComments: boolean
  /** Azul y oro theme, toggled by typing `boca` (an easter egg). */
  boca: boolean
}

export const DEFAULT_PREFS: Prefs = {
  mode: 'read',
  includeQuotes: true,
  showFiles: true,
  showComments: true,
  boca: false,
}

/** Stored preferences, falling back to the default for anything missing or malformed. */
export function parsePrefs(raw: string | null): Prefs {
  let data: Partial<Record<keyof Prefs, unknown>> = {}
  try {
    data = (JSON.parse(raw ?? '{}') as typeof data | null) ?? {}
  } catch {
    // Keep the defaults.
  }
  const flag = (key: 'includeQuotes' | 'showFiles' | 'showComments' | 'boca') =>
    typeof data[key] === 'boolean' ? data[key] : DEFAULT_PREFS[key]
  return {
    mode: data.mode === 'source' ? 'source' : 'read',
    includeQuotes: flag('includeQuotes'),
    showFiles: flag('showFiles'),
    showComments: flag('showComments'),
    boca: flag('boca'),
  }
}

export const STORAGE_VERSION = 1

export function storageKey(rootPath: string): string {
  return `mdifit:v${STORAGE_VERSION}:${rootPath}`
}

export function emptyState(): ReviewState {
  return { comments: [], read: {} }
}

/** Reads what localStorage held; anything malformed is dropped, never thrown. */
export function parseState(raw: string | null): ReviewState {
  if (!raw) return emptyState()
  try {
    const data = JSON.parse(raw) as Partial<ReviewState>
    const comments = Array.isArray(data.comments) ? data.comments.filter(isComment) : []
    const read: Record<string, number> = {}
    if (data.read && typeof data.read === 'object') {
      for (const [path, mtime] of Object.entries(data.read)) {
        if (typeof mtime === 'number') read[path] = mtime
      }
    }
    return { comments, read }
  } catch {
    return emptyState()
  }
}

export function serializeState(state: ReviewState): string {
  return JSON.stringify({ comments: state.comments, read: state.read })
}

/** Comments in reading order: by path, then line. */
export function sortComments(comments: ReviewComment[]): ReviewComment[] {
  return comments.toSorted(
    (a, b) =>
      a.path.localeCompare(b.path, 'en', { numeric: true }) ||
      a.startLine - b.startLine ||
      a.createdAt - b.createdAt,
  )
}

export function countByPath(comments: ReviewComment[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const comment of comments) counts.set(comment.path, (counts.get(comment.path) ?? 0) + 1)
  return counts
}

/** A file read before its last change counts as `edited`: worth another look. */
export function readStatus(file: WorkspaceFile, read: Record<string, number>): ReadStatus {
  const readAt = read[file.path]
  if (readAt === undefined) return 'unread'
  return file.mtimeMs > readAt ? 'edited' : 'read'
}

export function newCommentId(now: number, random: number): string {
  return `${now.toString(36)}-${Math.floor(random * 1e9).toString(36)}`
}

function isComment(value: unknown): value is ReviewComment {
  const c = value as ReviewComment
  return (
    typeof c === 'object' &&
    c !== null &&
    typeof c.id === 'string' &&
    typeof c.path === 'string' &&
    Number.isInteger(c.startLine) &&
    Number.isInteger(c.endLine) &&
    typeof c.body === 'string' &&
    (c.quote === null || typeof c.quote === 'string') &&
    (c.suggestion === null || typeof c.suggestion === 'string') &&
    typeof c.createdAt === 'number'
  )
}
