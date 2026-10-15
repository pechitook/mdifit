/** The breadcrumb: root, each folder, then the file being read. */

export interface Crumb {
  label: string
  /** Route path: `''` for the root, `plans/` for a folder, or the file path. */
  path: string
  current: boolean
}

/**
 * `viewPath` is the file on screen (a folder's README included), or `null` for a
 * folder page without one; `folder` is the folder route when there is one.
 */
export function breadcrumbs(
  rootName: string,
  folder: string | null,
  viewPath: string | null,
): Crumb[] {
  const target = viewPath ?? folder ?? ''
  const segments = target.split('/').filter(Boolean)
  const crumbs: Crumb[] = [{ label: rootName, path: '', current: false }]

  let prefix = ''
  segments.forEach((segment, index) => {
    const isFile = index === segments.length - 1 && viewPath !== null
    prefix = isFile ? `${prefix}${segment}` : `${prefix}${segment}/`
    crumbs.push({ label: segment, path: prefix, current: false })
  })

  const last = crumbs.at(-1)
  if (last) last.current = true
  return crumbs
}
