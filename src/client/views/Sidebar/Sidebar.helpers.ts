import type { WorkspaceFile } from '../../../shared/api.ts'
import { type ReadStatus, readStatus } from '../../stores/review.helpers.ts'
import { normalize } from '../../utils/text.ts'

/**
 * Builds the file tree the sidebar shows. Folders with a single child folder
 * are compacted (`plans/agent-kit`), like in most editors.
 */

export type FileFilter = 'all' | 'unread' | 'commented'

export interface TreeFile {
  kind: 'file'
  name: string
  path: string
  title: string | null
  status: ReadStatus
  comments: number
}

export interface TreeFolder {
  kind: 'folder'
  name: string
  path: string
  children: TreeNode[]
}

export type TreeNode = TreeFile | TreeFolder

export interface TreeInput {
  files: WorkspaceFile[]
  read: Record<string, number>
  commentCounts: Map<string, number>
  filter: FileFilter
  query: string
}

export function buildTree(input: TreeInput): TreeNode[] {
  const root: TreeFolder = { kind: 'folder', name: '', path: '', children: [] }

  for (const file of visibleFiles(input)) {
    const segments = file.path.split('/')
    let folder = root
    for (const name of segments.slice(0, -1)) {
      const path = folder.path ? `${folder.path}/${name}` : name
      let next = folder.children.find(
        (child): child is TreeFolder => child.kind === 'folder' && child.name === name,
      )
      if (!next) {
        next = { kind: 'folder', name, path, children: [] }
        folder.children.push(next)
      }
      folder = next
    }
    folder.children.push({
      kind: 'file',
      name: segments.at(-1) ?? file.path,
      path: file.path,
      title: file.title,
      status: readStatus(file, input.read),
      comments: input.commentCounts.get(file.path) ?? 0,
    })
  }

  return sortNodes(root.children.map(compact))
}

export function visibleFiles(input: TreeInput): WorkspaceFile[] {
  const query = normalize(input.query.trim())
  return input.files.filter((file) => {
    if (input.filter === 'unread' && readStatus(file, input.read) === 'read') return false
    if (input.filter === 'commented' && !input.commentCounts.get(file.path)) return false
    if (!query) return true
    return normalize(`${file.path} ${file.title ?? ''}`).includes(query)
  })
}

export function filterCounts(
  files: WorkspaceFile[],
  read: Record<string, number>,
  commentCounts: Map<string, number>,
): Record<FileFilter, number> {
  return {
    all: files.length,
    unread: files.filter((file) => readStatus(file, read) !== 'read').length,
    commented: files.filter((file) => commentCounts.get(file.path)).length,
  }
}

/** Files in depth-first tree order: what "next file" means. */
export function flattenFiles(nodes: TreeNode[]): TreeFile[] {
  return nodes.flatMap((node) => (node.kind === 'file' ? [node] : flattenFiles(node.children)))
}

function compact(node: TreeNode): TreeNode {
  if (node.kind === 'file') return node
  let folder = node
  while (folder.children.length === 1 && folder.children[0]?.kind === 'folder') {
    const child: TreeFolder = folder.children[0]
    folder = { ...child, name: `${folder.name}/${child.name}` }
  }
  return { ...folder, children: folder.children.map(compact) }
}

/** Folders first, then files; each group by name. */
function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((node) =>
      node.kind === 'folder' ? { ...node, children: sortNodes(node.children) } : node,
    )
    .toSorted((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true })
    })
}
