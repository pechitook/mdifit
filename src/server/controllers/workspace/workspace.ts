import { Hono } from 'hono'
import { AppError } from '../../lib/errors.ts'
import {
  type WorkspaceConfig,
  getWorkspace,
  readMarkdown,
  readRaw,
} from '../../modules/workspace/workspace.ts'

/** `GET /api/workspace` and `GET /api/file?path=`. */
export function workspaceController(config: WorkspaceConfig): Hono {
  return new Hono()
    .get('/workspace', async (c) => c.json(await getWorkspace(config)))
    .get('/file', async (c) => {
      const relPath = c.req.query('path')
      if (!relPath) throw new AppError('bad_request', 'path is required')
      return c.json(await readMarkdown(config, relPath))
    })
}

/**
 * `GET /raw/<path>`: images referenced by Markdown. Served sandboxed, so an SVG
 * opened on its own cannot run script on this origin.
 */
export function rawController(config: WorkspaceConfig): Hono {
  return new Hono().get('/*', async (c) => {
    const relPath = decodeURIComponent(c.req.path.replace(/^\/raw\//, ''))
    const { body, contentType } = await readRaw(config, relPath)
    return c.body(new Uint8Array(body), 200, {
      'Content-Type': contentType,
      'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    })
  })
}
