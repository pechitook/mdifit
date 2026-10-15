import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Context } from 'hono'
import { resolveInside } from '../modules/workspace/workspace.rules.ts'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/**
 * Serves the built web client. Unknown paths fall back to `index.html`; hashed
 * assets are cached for good, the page itself never.
 */
export function serveClient(clientDir: string) {
  return async (c: Context): Promise<Response> => {
    const relPath = decodeURIComponent(c.req.path).replace(/^\/+/, '')
    const asset = relPath ? resolveInside(clientDir, relPath) : null
    const type = asset ? CONTENT_TYPES[path.extname(asset)] : undefined

    if (asset && type) {
      const body = await readFile(asset).catch(() => null)
      if (body) {
        const cache = relPath.startsWith('assets/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache'
        return c.body(new Uint8Array(body), 200, { 'Content-Type': type, 'Cache-Control': cache })
      }
    }

    const index = await readFile(path.join(clientDir, 'index.html'))
    return c.body(new Uint8Array(index), 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    })
  }
}
