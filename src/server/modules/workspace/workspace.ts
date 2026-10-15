import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import type { FileResponse, WorkspaceFile, WorkspaceResponse } from '../../../shared/api.ts'
import { AppError } from '../../lib/errors.ts'
import {
  RAW_CONTENT_TYPES,
  comparePaths,
  extractTitle,
  isIgnoredDirName,
  isMarkdownPath,
  promptBaseFor,
  resolveInside,
  toPosix,
} from './workspace.rules.ts'

/** What the CLI was pointed at, resolved once at startup. */
export interface WorkspaceConfig {
  /** Absolute path the CLI was given (a folder or a single file). */
  target: string
  /** Folder every workspace path is relative to. */
  root: string
  /** Workspace path of the only file in single-file mode, else `null`. */
  only: string | null
  /** Folder the CLI was started from; prompts are relative to it. */
  cwd: string
}

/** Walking stops here: a folder this big is not documentation. */
export const MAX_FILES = 5000
/** Files bigger than this are listed but not read for a title. */
const TITLE_READ_LIMIT = 1024 * 1024

export async function resolveWorkspace(targetArg: string, cwd: string): Promise<WorkspaceConfig> {
  const absolute = path.resolve(cwd, targetArg)
  let target: string
  try {
    target = await realpath(absolute)
  } catch {
    throw new AppError('not_found', `Nothing at ${absolute}`)
  }

  const info = await stat(target)
  if (info.isDirectory()) return { target, root: target, only: null, cwd }
  if (info.isFile() && isMarkdownPath(target)) {
    return { target, root: path.dirname(target), only: path.basename(target), cwd }
  }
  throw new AppError('bad_request', `${absolute} is not a folder or a Markdown file`)
}

export async function getWorkspace(config: WorkspaceConfig): Promise<WorkspaceResponse> {
  return {
    name: path.basename(config.target),
    rootPath: config.root,
    promptBase: promptBaseFor(config.cwd, config.root),
    single: config.only !== null,
    files: await listFiles(config),
  }
}

export async function listFiles(config: WorkspaceConfig): Promise<WorkspaceFile[]> {
  const paths = config.only ? [config.only] : await walk(config.root)
  const files = await Promise.all(paths.map((relPath) => describeFile(config.root, relPath)))
  return files.filter((file): file is WorkspaceFile => file !== null)
}

export async function readMarkdown(
  config: WorkspaceConfig,
  relPath: string,
): Promise<FileResponse> {
  const absolute = markdownPathOrThrow(config, relPath)
  try {
    const [source, info] = await Promise.all([readFile(absolute, 'utf8'), stat(absolute)])
    return { path: toPosix(relPath), source, mtimeMs: info.mtimeMs }
  } catch {
    throw new AppError('not_found', `No file at ${relPath}`)
  }
}

export async function readRaw(
  config: WorkspaceConfig,
  relPath: string,
): Promise<{ body: Buffer; contentType: string }> {
  const absolute = resolveInside(config.root, relPath)
  const contentType = RAW_CONTENT_TYPES[path.extname(relPath).toLowerCase()]
  if (!absolute || !contentType) throw new AppError('not_found', `No media at ${relPath}`)
  try {
    return { body: await readFile(absolute), contentType }
  } catch {
    throw new AppError('not_found', `No media at ${relPath}`)
  }
}

/** True when a workspace path is a Markdown file this workspace shows. */
export function isWorkspaceMarkdown(config: WorkspaceConfig, relPath: string): boolean {
  if (config.only) return toPosix(relPath) === config.only
  return isMarkdownPath(relPath) && resolveInside(config.root, relPath) !== null
}

function markdownPathOrThrow(config: WorkspaceConfig, relPath: string): string {
  const absolute = resolveInside(config.root, relPath)
  if (!absolute || !isWorkspaceMarkdown(config, relPath)) {
    throw new AppError('not_found', `No Markdown file at ${relPath}`)
  }
  return absolute
}

async function walk(root: string): Promise<string[]> {
  const found: string[] = []
  const pending = ['']

  while (pending.length > 0 && found.length < MAX_FILES) {
    const dir = pending.shift() ?? ''
    const entries = await readdir(path.join(root, dir), { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      // Symlinks are skipped: they can loop or point outside the root.
      if (entry.isSymbolicLink()) continue
      const relPath = dir ? `${dir}/${entry.name}` : entry.name
      if (entry.isDirectory() && !isIgnoredDirName(entry.name)) pending.push(relPath)
      else if (entry.isFile() && isMarkdownPath(entry.name)) found.push(relPath)
    }
  }

  return found.slice(0, MAX_FILES).toSorted(comparePaths)
}

async function describeFile(root: string, relPath: string): Promise<WorkspaceFile | null> {
  const absolute = path.join(root, relPath)
  try {
    const info = await stat(absolute)
    const title =
      info.size <= TITLE_READ_LIMIT ? extractTitle(await readFile(absolute, 'utf8')) : null
    return { path: toPosix(relPath), title, mtimeMs: info.mtimeMs, size: info.size }
  } catch {
    // Deleted between the listing and the stat: just leave it out.
    return null
  }
}
