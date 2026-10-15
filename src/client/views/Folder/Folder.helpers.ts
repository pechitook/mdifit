import type { WorkspaceFile } from '../../../shared/api.ts'
import { type ReadStatus, readStatus } from '../../stores/review.helpers.ts'

/**
 * Rules for folder pages: which file a folder opens with, and what it lists.
 * Folder paths end in `/`; the root folder is `''`.
 */

/** Files a folder opens with, in order of preference. */
export const ENTRY_NAMES = ['readme.md', 'agents.md', 'index.md', 'readme.markdown']

export interface FolderItem {
  name: string
  /** Folder path with its trailing slash. */
  path: string
  files: number
  unread: number
  comments: number
}

export interface FileItem {
  name: string
  path: string
  title: string | null
  status: ReadStatus
  comments: number
  mtimeMs: number
}

export interface FolderListing {
  folders: FolderItem[]
  files: FileItem[]
}

/** Entry files directly inside the folder, most preferred first. */
export function folderEntries(files: WorkspaceFile[], folder: string): string[] {
  return files
    .filter((file) => childName(file.path, folder) !== null)
    .map((file) => ({
      path: file.path,
      rank: ENTRY_NAMES.indexOf(baseName(file.path).toLowerCase()),
    }))
    .filter((entry) => entry.rank >= 0)
    .toSorted((a, b) => a.rank - b.rank)
    .map((entry) => entry.path)
}

/** True when the folder is the root or holds at least one Markdown file. */
export function folderExists(files: WorkspaceFile[], folder: string): boolean {
  return folder === '' || files.some((file) => file.path.startsWith(folder))
}

/** Direct subfolders (with totals for everything under them) and direct files. */
export function listFolder(
  files: WorkspaceFile[],
  folder: string,
  read: Record<string, number>,
  commentCounts: Map<string, number>,
): FolderListing {
  const folders = new Map<string, FolderItem>()
  const direct: FileItem[] = []

  for (const file of files) {
    if (!file.path.startsWith(folder)) continue
    const rest = file.path.slice(folder.length)
    const slash = rest.indexOf('/')
    const status = readStatus(file, read)
    const comments = commentCounts.get(file.path) ?? 0

    if (slash < 0) {
      direct.push({
        name: rest,
        path: file.path,
        title: file.title,
        status,
        comments,
        mtimeMs: file.mtimeMs,
      })
      continue
    }
    const name = rest.slice(0, slash)
    const item = folders.get(name) ?? {
      name,
      path: `${folder}${name}/`,
      files: 0,
      unread: 0,
      comments: 0,
    }
    item.files += 1
    item.unread += status === 'read' ? 0 : 1
    item.comments += comments
    folders.set(name, item)
  }

  return { folders: [...folders.values()].toSorted(byName), files: direct.toSorted(byName) }
}

/** The folder's own name: `plans/queue/` → `queue`; the root uses `rootName`. */
export function folderName(folder: string, rootName: string): string {
  return folder === '' ? rootName : (folder.slice(0, -1).split('/').at(-1) ?? rootName)
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true })
}

function childName(path: string, folder: string): string | null {
  if (!path.startsWith(folder)) return null
  const rest = path.slice(folder.length)
  return rest.includes('/') ? null : rest
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}
