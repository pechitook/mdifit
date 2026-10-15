/**
 * The app routes through the hash: `#/plans/a.md#scope` opens `plans/a.md` and
 * scrolls to the `scope` heading; `#/plans/a.md#L12` scrolls to source line 12.
 * A path ending in `/` is a folder (`#/plans/`); `#/` is the root folder.
 */

export interface Route {
  /** File path, folder path (`plans/`, root `''`), or `null` before the first route. */
  path: string | null
  anchor: string | null
}

export function parseHash(hash: string): Route {
  if (!hash.startsWith('#/')) return { path: null, anchor: null }
  const rest = hash.slice(2)
  const index = rest.indexOf('#')
  const rawPath = index < 0 ? rest : rest.slice(0, index)
  const rawAnchor = index < 0 ? '' : rest.slice(index + 1)
  return { path: decode(rawPath), anchor: decode(rawAnchor) || null }
}

export function formatHash(route: Route): string {
  if (route.path === null) return ''
  const path = route.path.split('/').map(encodeURIComponent).join('/')
  return `#/${path}${route.anchor ? `#${encodeURIComponent(route.anchor)}` : ''}`
}

export function isFolderPath(path: string | null): path is string {
  return path !== null && (path === '' || path.endsWith('/'))
}

/** The folder a file lives in: `plans/a.md` → `plans/`, `a.md` → `''`. */
export function folderOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1)
}

/** `L12` → 12. Any other anchor is a heading id. */
export function lineAnchor(anchor: string | null): number | null {
  const match = anchor ? /^L(\d+)$/.exec(anchor) : null
  return match?.[1] ? Number(match[1]) : null
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
