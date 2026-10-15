import { Hono } from 'hono'
import type { HealthResponse, SearchHit } from '../shared/api.ts'
import { eventsController } from './controllers/events/events.ts'
import { searchController } from './controllers/search/search.ts'
import { rawController, workspaceController } from './controllers/workspace/workspace.ts'
import type { Watcher } from './modules/watch/watch.ts'
import type { WorkspaceConfig } from './modules/workspace/workspace.ts'

export interface RouteDeps {
  config: WorkspaceConfig
  version: string
  watcher: Watcher
  search: (query: string) => Promise<SearchHit[]>
  shutdown: AbortSignal
}

/** The only place routes are registered. */
export function createRoutes(deps: RouteDeps): Hono {
  const api = new Hono()
    .get('/health', (c) => {
      const body: HealthResponse = {
        app: 'mdifit',
        version: deps.version,
        target: deps.config.target,
      }
      return c.json(body)
    })
    .route('/', workspaceController(deps.config))
    .route('/', searchController(deps.search))
    .route('/', eventsController(deps.watcher, deps.shutdown))

  return new Hono().route('/api', api).route('/raw', rawController(deps.config))
}
