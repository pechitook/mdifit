import type {
  ApiErrorBody,
  ChangeEvent,
  FileResponse,
  SearchResponse,
  WorkspaceResponse,
} from '../../shared/api.ts'

/** Every request to the local server goes through here. One function per endpoint, no logic. */

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new ApiError(0, 'offline', 'mdifit is not running. Start it again from the terminal.')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      res.status,
      body?.error.code ?? 'error',
      body?.error.message ?? res.statusText,
    )
  }
  return (await res.json()) as T
}

export function getWorkspace(): Promise<WorkspaceResponse> {
  return request('/api/workspace')
}

export function getFile(path: string): Promise<FileResponse> {
  return request(`/api/file?path=${encodeURIComponent(path)}`)
}

export function search(query: string, signal?: AbortSignal): Promise<SearchResponse> {
  return request(`/api/search?q=${encodeURIComponent(query)}`, signal)
}

/** Calls `onChange` with the workspace path of every edited file. Returns the unsubscribe. */
export function subscribeChanges(onChange: (path: string) => void): () => void {
  const source = new EventSource('/api/events')
  source.addEventListener('change', (event) => {
    const data = JSON.parse((event as MessageEvent<string>).data) as ChangeEvent
    onChange(data.path)
  })
  return () => source.close()
}
