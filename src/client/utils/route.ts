/**
 * The app routes through the hash: `#/plans/a.md#scope` opens `plans/a.md` and
 * scrolls to the `scope` heading; `#/plans/a.md#L12` scrolls to source line 12.
 */

export interface Route {
  path: string | null
  anchor: string | null
}

export function parseHash(hash: string): Route {
  if (!hash.startsWith('#/')) return { path: null, anchor: null }
  const rest = hash.slice(2)
  const index = rest.indexOf('#')
  const rawPath = index < 0 ? rest : rest.slice(0, index)
  const rawAnchor = index < 0 ? '' : rest.slice(index + 1)
  return { path: decode(rawPath) || null, anchor: decode(rawAnchor) || null }
}

export function formatHash(route: Route): string {
  if (!route.path) return ''
  const path = route.path.split('/').map(encodeURIComponent).join('/')
  return `#/${path}${route.anchor ? `#${encodeURIComponent(route.anchor)}` : ''}`
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
