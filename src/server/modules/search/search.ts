import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { SearchHit } from '../../../shared/api.ts'
import { type WorkspaceConfig, listFiles } from '../workspace/workspace.ts'
import { type SearchDoc, searchDocs } from './search.rules.ts'

interface CachedDoc {
  mtimeMs: number
  source: string
}

/**
 * Searches every Markdown file in the workspace. Sources are cached by mtime,
 * so repeated keystrokes in the palette only re-read files that changed.
 */
export function createSearch(config: WorkspaceConfig): (query: string) => Promise<SearchHit[]> {
  const cache = new Map<string, CachedDoc>()

  async function load(): Promise<SearchDoc[]> {
    const files = await listFiles(config)
    const docs = await Promise.all(
      files.map(async (file): Promise<SearchDoc | null> => {
        const cached = cache.get(file.path)
        if (cached?.mtimeMs === file.mtimeMs) return { path: file.path, source: cached.source }
        try {
          const source = await readFile(path.join(config.root, file.path), 'utf8')
          cache.set(file.path, { mtimeMs: file.mtimeMs, source })
          return { path: file.path, source }
        } catch {
          return null
        }
      }),
    )
    return docs.filter((doc): doc is SearchDoc => doc !== null)
  }

  return async (query) => searchDocs(await load(), query)
}
