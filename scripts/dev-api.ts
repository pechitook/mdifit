import path from 'node:path'
import { getRequestListener } from '@hono/node-server'
import type { Plugin, ViteDevServer } from 'vite'
import type * as AppModule from '../src/server/app.ts'
import type * as WorkspaceModule from '../src/server/modules/workspace/workspace.ts'

/**
 * Serves the mdifit API from inside the Vite dev server, so `npm run dev` is
 * one process: the client hot-reloads, and server modules reload on save
 * because they are loaded through Vite's SSR module graph.
 */

interface ServerModules {
  app: typeof AppModule
  workspace: typeof WorkspaceModule
}

const ROOT = path.resolve(import.meta.dirname, '..')

export function devApi(): Plugin {
  return {
    name: 'mdifit-dev-api',
    apply: 'serve',
    configureServer(server) {
      const target = process.env.MDIFIT_DEV_TARGET
      const cwd = process.env.MDIFIT_DEV_CWD ?? process.cwd()
      if (!target) {
        server.config.logger.warn('MDIFIT_DEV_TARGET is not set: run `npm run dev -- <folder>`.')
        return
      }

      let current: {
        appModule: unknown
        close(): void
        handle: ReturnType<typeof getRequestListener>
      } | null = null

      async function handler(): Promise<ReturnType<typeof getRequestListener>> {
        const modules = await load(server)
        if (current?.appModule !== modules.app) {
          current?.close()
          const config = await modules.workspace.resolveWorkspace(target as string, cwd)
          const created = modules.app.createApp({ config, version: 'dev', clientDir: null })
          current = {
            appModule: modules.app,
            close: created.close,
            handle: getRequestListener(created.app.fetch),
          }
        }
        return current.handle
      }

      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/') && !req.url?.startsWith('/raw/')) return next()
        handler()
          .then((handle) => handle(req, res))
          .catch(next)
      })
      server.httpServer?.on('close', () => current?.close())
    },
  }
}

async function load(server: ViteDevServer): Promise<ServerModules> {
  const [app, workspace] = await Promise.all([
    server.ssrLoadModule(path.join(ROOT, 'src/server/app.ts')),
    server.ssrLoadModule(path.join(ROOT, 'src/server/modules/workspace/workspace.ts')),
  ])
  return { app, workspace } as unknown as ServerModules
}
