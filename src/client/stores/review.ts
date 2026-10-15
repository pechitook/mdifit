import { reactive, watch } from 'vue'
import type { WorkspaceFile } from '../../shared/api.ts'
import {
  type Prefs,
  type ReviewComment,
  type ReviewState,
  newCommentId,
  parsePrefs,
  parseState,
  serializeState,
  storageKey,
} from './review.helpers.ts'

export type { Prefs }
export type ReviewStore = ReturnType<typeof createReviewStore>

/**
 * Comments and reading progress for one workspace, persisted to localStorage
 * and kept in sync across tabs of the same workspace.
 */
export function createReviewStore(rootPath: string) {
  const key = storageKey(rootPath)
  const state = reactive<ReviewState>(parseState(readStorage(key)))

  watch(state, () => writeStorage(key, serializeState(state)), { deep: true })

  window.addEventListener('storage', (event) => {
    if (event.key !== key) return
    const next = parseState(event.newValue)
    state.comments = next.comments
    state.read = next.read
  })

  return {
    state,

    addComment(input: Omit<ReviewComment, 'id' | 'createdAt'>): ReviewComment {
      const comment: ReviewComment = {
        ...input,
        id: newCommentId(Date.now(), Math.random()),
        createdAt: Date.now(),
      }
      state.comments.push(comment)
      return comment
    },

    updateComment(id: string, input: Omit<ReviewComment, 'id' | 'createdAt'>): void {
      const index = state.comments.findIndex((c) => c.id === id)
      const current = state.comments[index]
      if (current) state.comments[index] = { ...current, ...input }
    },

    removeComment(id: string): void {
      state.comments = state.comments.filter((c) => c.id !== id)
    },

    /** Removes the given comments, or all of them. */
    clearComments(ids?: string[]): void {
      const remove = ids ? new Set(ids) : null
      state.comments = remove ? state.comments.filter((c) => !remove.has(c.id)) : []
    },

    markRead(file: WorkspaceFile): void {
      state.read[file.path] = file.mtimeMs
    },

    markUnread(path: string): void {
      delete state.read[path]
    },
  }
}

/** Storage can be unavailable (private mode, blocked site data): fail soft. */
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Quota or blocked storage: the review still works for this session.
  }
}

const PREFS_KEY = 'mdifit:prefs'

export function loadPrefs(): Prefs {
  return parsePrefs(readStorage(PREFS_KEY))
}

export function savePrefs(prefs: Prefs): void {
  writeStorage(PREFS_KEY, JSON.stringify(prefs))
}
