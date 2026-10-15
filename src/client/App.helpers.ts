import type { WorkspaceFile } from '../shared/api.ts'
import { readStatus } from './stores/review.helpers.ts'

/** Shell rules: which file opens first, what "next" means, progress. */

const ENTRY_NAMES = ['readme.md', 'index.md', 'readme.markdown']

/** A root README opens first; otherwise the first file in tree order. */
export function defaultPath(files: WorkspaceFile[], treeOrder: string[]): string | null {
  const entry = files.find((file) => ENTRY_NAMES.includes(file.path.toLowerCase()))
  return entry?.path ?? treeOrder[0] ?? files[0]?.path ?? null
}

/** The file `delta` steps away in tree order, without wrapping. */
export function adjacentPath(
  order: string[],
  current: string | null,
  delta: 1 | -1,
): string | null {
  if (!current) return order[0] ?? null
  const index = order.indexOf(current)
  if (index < 0) return order[0] ?? null
  return order[index + delta] ?? null
}

/** Next file not yet read (or changed since), after the current one, wrapping around. */
export function nextUnreadPath(
  order: string[],
  files: WorkspaceFile[],
  read: Record<string, number>,
  current: string | null,
): string | null {
  const byPath = new Map(files.map((file) => [file.path, file]))
  const start = current ? order.indexOf(current) : -1
  for (let step = 1; step <= order.length; step++) {
    const path = order[(start + step) % order.length]
    const file = path ? byPath.get(path) : undefined
    if (file && path !== current && readStatus(file, read) !== 'read') return path ?? null
  }
  return null
}

export function readCount(files: WorkspaceFile[], read: Record<string, number>): number {
  return files.filter((file) => readStatus(file, read) === 'read').length
}
