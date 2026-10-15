import { type FSWatcher, watch } from 'node:fs'
import { type WorkspaceConfig, isWorkspaceMarkdown } from '../workspace/workspace.ts'
import { isIgnoredPath, toPosix } from '../workspace/workspace.rules.ts'

export type ChangeListener = (relPath: string) => void

export interface Watcher {
  /** Returns the function that unsubscribes. */
  subscribe(listener: ChangeListener): () => void
  close(): void
}

/** Editors write in bursts (temp file, rename, chmod): one event per burst. */
const DEBOUNCE_MS = 80

/**
 * Watches the workspace for Markdown changes (edit, add, delete) and tells
 * subscribers the workspace path that changed. One fs watcher per server.
 */
export function createWatcher(config: WorkspaceConfig): Watcher {
  const listeners = new Set<ChangeListener>()
  const timers = new Map<string, NodeJS.Timeout>()
  let watcher: FSWatcher | null = null

  function emit(relPath: string): void {
    clearTimeout(timers.get(relPath))
    timers.set(
      relPath,
      setTimeout(() => {
        timers.delete(relPath)
        for (const listener of listeners) listener(relPath)
      }, DEBOUNCE_MS),
    )
  }

  try {
    watcher = watch(config.root, { recursive: true }, (_event, filename) => {
      if (!filename) return
      const relPath = toPosix(filename.toString())
      if (isIgnoredPath(relPath) || !isWorkspaceMarkdown(config, relPath)) return
      emit(relPath)
    })
    // A deleted root or a full inotify table should not crash the server.
    watcher.on('error', () => watcher?.close())
  } catch {
    watcher = null
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    close() {
      watcher?.close()
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
      listeners.clear()
    },
  }
}
