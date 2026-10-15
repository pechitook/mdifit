/**
 * HTTP contract between the local server and the web client. Types only: this
 * folder never holds runtime code, so neither side drags the other's
 * dependencies along.
 */

export interface WorkspaceFile {
  /** POSIX path relative to the workspace root: `orders/plan.md`. */
  path: string
  /** First `# heading` (or front matter `title`), when the file has one. */
  title: string | null
  mtimeMs: number
  size: number
}

export interface WorkspaceResponse {
  /** Folder name shown in the UI. */
  name: string
  /** Absolute root path. The client keys its local storage by it. */
  rootPath: string
  /**
   * Prefix that turns a workspace path into a path relative to where the CLI
   * was started (`plans/`), so prompts point at files the agent can open.
   */
  promptBase: string
  /** True when the CLI was given a single file instead of a folder. */
  single: boolean
  files: WorkspaceFile[]
}

export interface FileResponse {
  path: string
  source: string
  mtimeMs: number
}

export type SearchHitKind = 'heading' | 'text'

export interface SearchHit {
  kind: SearchHitKind
  path: string
  /** 1-based source line. */
  line: number
  text: string
  /** Heading level (1-6), only for `heading` hits. */
  level: number | null
}

export interface SearchResponse {
  hits: SearchHit[]
}

/** Sent on `GET /api/events` as the `change` server-sent event. */
export interface ChangeEvent {
  path: string
}

export interface HealthResponse {
  app: 'mdifit'
  version: string
  /** Absolute path the instance was started with (file or folder). */
  target: string
}

export interface ApiErrorBody {
  error: { code: string; message: string }
}
