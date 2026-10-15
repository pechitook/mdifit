import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { ChangeEvent } from '../../../shared/api.ts'
import type { Watcher } from '../../modules/watch/watch.ts'

/** Proxies and browsers drop idle streams; a ping keeps them open. */
const PING_MS = 25_000

/**
 * `GET /api/events`: server-sent `change` events with the workspace path of
 * every Markdown file edited, added or deleted. Streams end on `shutdown`.
 */
export function eventsController(watcher: Watcher, shutdown: AbortSignal): Hono {
  return new Hono().get('/events', (c) =>
    streamSSE(c, async (stream) => {
      const unsubscribe = watcher.subscribe((path) => {
        const event: ChangeEvent = { path }
        void stream.writeSSE({ event: 'change', data: JSON.stringify(event) })
      })
      const stopped = new Promise<void>((resolve) => {
        stream.onAbort(resolve)
        shutdown.addEventListener('abort', () => resolve(), { once: true })
      })

      while (!stream.aborted && !shutdown.aborted) {
        await stream.writeSSE({ event: 'ping', data: '' })
        await Promise.race([stream.sleep(PING_MS), stopped])
      }
      unsubscribe()
    }),
  )
}
