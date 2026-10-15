import { Hono } from 'hono'
import type { SearchHit, SearchResponse } from '../../../shared/api.ts'

/** `GET /api/search?q=`: headings and text lines across the workspace. */
export function searchController(search: (query: string) => Promise<SearchHit[]>): Hono {
  return new Hono().get('/search', async (c) => {
    const body: SearchResponse = { hits: await search(c.req.query('q') ?? '') }
    return c.json(body)
  })
}
