import path from 'node:path'

/**
 * Pure rules about which files belong to a workspace and how paths are
 * resolved. No `fs` here: the module does the IO and asks these functions.
 */

export const MARKDOWN_EXTENSIONS = ['.md', '.markdown'] as const

/** Folders never worth reading as documentation. Hidden folders are skipped too. */
export const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'out',
  'target',
  'vendor',
  '__pycache__',
])

/** Media `GET /raw/*` will serve, so relative images in Markdown render. */
export const RAW_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

export function isMarkdownPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return (MARKDOWN_EXTENSIONS as readonly string[]).includes(ext)
}

export function isIgnoredDirName(name: string): boolean {
  return name.startsWith('.') || IGNORED_DIRS.has(name)
}

/** True when any folder segment of a workspace-relative path is ignored. */
export function isIgnoredPath(relPath: string): boolean {
  const segments = toPosix(relPath).split('/')
  segments.pop()
  return segments.some(isIgnoredDirName)
}

export function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

/**
 * Resolves a client-supplied workspace path to an absolute path, or `null` when
 * it is empty, absolute, or escapes the root. Never trust a path from the client
 * without passing it through here.
 */
export function resolveInside(root: string, relPath: string): string | null {
  if (!relPath || relPath.includes('\0')) return null
  if (path.isAbsolute(relPath) || /^[a-zA-Z]:/.test(relPath)) return null
  const absolute = path.resolve(root, relPath)
  const relative = path.relative(root, absolute)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null
  return absolute
}

/**
 * The prefix prompts put before a workspace path so it is relative to the
 * folder the CLI was started from: `plans/` for `npx mdifit plans`.
 */
export function promptBaseFor(cwd: string, root: string): string {
  const relative = toPosix(path.relative(cwd, root))
  return relative ? `${relative}/` : ''
}

/** Front matter `title:` wins, then the first `# heading` outside a code fence. */
export function extractTitle(source: string): string | null {
  const lines = source.split(/\r?\n/)
  let start = 0

  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
    if (end > 0) {
      for (const line of lines.slice(1, end)) {
        const match = /^title:\s*(.+?)\s*$/.exec(line)
        if (match?.[1]) return unquote(match[1])
      }
      start = end + 1
    }
  }

  let fence: string | null = null
  for (const line of lines.slice(start)) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceMatch?.[1]) {
      const marker = fenceMatch[1].charAt(0)
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence !== null) continue
    const heading = /^\s{0,3}#\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading?.[1]) return heading[1]
  }
  return null
}

function unquote(value: string): string {
  const match = /^(['"])(.*)\1$/.exec(value)
  return match?.[2] ?? value
}

/** Stable order for the tree: folders and files by path, case-insensitive. */
export function comparePaths(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true })
}
