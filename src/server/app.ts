import { Hono } from 'hono'
import type { ApiErrorBody } from '../shared/api.ts'
import { AppError } from './lib/errors.ts'
import { isAllowedHost } from './lib/host.ts'
import { serveClient } from './lib/static.ts'
import { createSearch } from './modules/search/search.ts'
import { createWatcher } from './modules/watch/watch.ts'
import type { WorkspaceConfig } from './modules/workspace/workspace.ts'
import { createRoutes } from './routes.ts'

export interface AppOptions {
  config: WorkspaceConfig
  version: string
  /** Built web client to serve, or `null` when Vite serves it (dev, tests). */
  clientDir: string | null
}

export interface MdifitApp {
  app: Hono
  /** Stops the file watcher and ends open event streams. */
  close(): void
}

export function createApp({ config, version, clientDir }: AppOptions): MdifitApp {
  const watcher = createWatcher(config)
  const shutdown = new AbortController()
  const app = new Hono()

  app.use(async (c, next) => {
    if (!isAllowedHost(c.req.header('host'))) {
      throw new AppError('forbidden', 'mdifit only answers on localhost')
    }
    await next()
  })

  app.route(
    '/',
    createRoutes({
      config,
      version,
      watcher,
      search: createSearch(config),
      shutdown: shutdown.signal,
    }),
  )

  app.notFound((c) => {
    if (clientDir && c.req.method === 'GET' && !c.req.path.startsWith('/api/')) {
      return serveClient(clientDir)(c)
    }
    return c.json(new AppError('not_found', `No route for ${c.req.path}`).toBody(), 404)
  })

  app.onError((error, c) => {
    if (error instanceof AppError) return c.json(error.toBody(), error.status)
    console.error(error)
    const body: ApiErrorBody = { error: { code: 'internal', message: 'Unexpected error' } }
    return c.json(body, 500)
  })

  return {
    app,
    close() {
      shutdown.abort()
      watcher.close()
    },
  }
}
