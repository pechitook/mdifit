/** Workspace path helpers. Workspace paths are POSIX and relative to the root. */

/**
 * Resolves a relative link found in `fromFile` to a workspace path, or `null`
 * when it climbs above the root. `('plans/a.md', '../guides/b.md')` → `guides/b.md`.
 */
export function resolveRelative(fromFile: string, href: string): string | null {
  const segments = fromFile.split('/').slice(0, -1)
  for (const part of safeDecode(href).split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (segments.length === 0) return null
      segments.pop()
    } else {
      segments.push(part)
    }
  }
  return segments.length > 0 ? segments.join('/') : null
}

/** `scheme:` links, protocol-relative links and absolute paths are not ours. */
export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//') || href.startsWith('/')
}

export function isMarkdownHref(path: string): boolean {
  return /\.(md|markdown)$/i.test(path)
}

/** Encodes each segment, keeping the slashes: `a b/c.png` → `a%20b/c.png`. */
export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

export function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

export function dirName(path: string): string {
  const index = path.lastIndexOf('/')
  return index < 0 ? '' : path.slice(0, index)
}

function safeDecode(value: string): string {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}
