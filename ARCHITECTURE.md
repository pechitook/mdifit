# Architecture

How mdifit is put together, layer by layer. Rules and commands are in
[AGENTS.md](AGENTS.md); this file explains the why and the flows.

```
mdifit [path]                       browser (http://localhost:47613)
┌──────────────┐  serve()  ┌──────────────────────────┐  fetch / EventSource  ┌────────────┐
│ src/cli      │ ────────▶ │ src/server (Hono)         │ ◀──────────────────── │ src/client │
│ args, port,  │           │ /api/workspace /api/file  │                       │ Vue 3      │
│ reuse, open  │           │ /api/search  /api/events  │ ── dist/client ─────▶ │ localStorage│
└──────────────┘           │ /raw/* (images)           │                       └────────────┘
                           └────────────┬─────────────┘
                                        │ node:fs (read-only) + fs.watch
                                        ▼
                                 the folder on disk
```

## CLI

`src/cli/index.ts` is the binary (`dist/node/cli/index.js` once built).

1. `args.ts` parses `[path] [--port] [--no-open] [-v] [-h]` with `node:util` `parseArgs`.
2. `resolveWorkspace` (server module) turns the path into `{ target, root, only, cwd }`.
   A file becomes single-file mode: its folder is the root and only it is served.
3. `instance.ts` probes `GET /api/health` on the port; `instance.rules.ts` decides:
   free → start; mdifit serving the same target → just open the browser; anything else →
   explain the conflict and exit 1. The port never moves on its own (ADR-001).
4. `serve()` binds `127.0.0.1` only, prints the banner and opens `http://localhost:<port>`.
   Ctrl+C closes the watcher and the event streams.

## Server

Hono, layered like the rest of our codebases: `routes → controllers → modules → fs`.

| Endpoint | Module | Notes |
|---|---|---|
| `GET /api/health` | — | `{ app: 'mdifit', version, target }`, used by the CLI probe |
| `GET /api/workspace` | `workspace.getWorkspace` | Markdown files (`.md`, `.markdown`) with title and mtime. Skips hidden folders, `node_modules`, build output and symlinks; caps at 5 000 files |
| `GET /api/file?path=` | `workspace.readMarkdown` | Source + mtime |
| `GET /raw/<path>` | `workspace.readRaw` | Images referenced by Markdown, sandbox CSP |
| `GET /api/search?q=` | `search.createSearch` | Headings first, then text lines; accent-insensitive; sources cached by mtime |
| `GET /api/events` | `watch.createWatcher` | SSE `change` with the workspace path; one recursive `fs.watch`, debounced per path |

Safety: every client path passes `resolveInside` (no absolute paths, no `..` escapes);
requests whose `Host` is not `localhost`, `127.0.0.1` or `[::1]` get a 403, which blocks
DNS-rebinding pages from reading the folder.

Tests run the real thing: `test-helpers.js` creates temp folders on disk, `app.test.js`
drives the Hono app with `app.request()`.

## Client

Vue 3 without a router or a state library: the shell (`App.vue`) owns the state and the
hash is the route (`#/plans/a.md#scope`, `#/plans/a.md#L12`, `#/plans/a.md#comment-<id>`).

### From Markdown to commentable blocks

`utils/markdown.ts` configures markdown-it (raw HTML off, linkify on, highlight.js for
common languages) and a core rule that:

- tags every block token with `data-line-start` / `data-line-end` from markdown-it's
  source map, trimming trailing blank lines;
- gives headings GitHub-style ids and collects the outline;
- turns `> [!NOTE]`-style blockquotes into alerts and `- [ ]` items into checkboxes;
- rewrites relative `.md` links to in-app routes and relative images to `/raw/…`.

Front matter is replaced by blank lines before parsing, so line numbers stay true.
`renderMarkdown` then splits the token stream into top-level blocks and renders each one
separately. The reader lays those blocks out with Vue, which is what lets comment cards and
the composer sit *between* blocks instead of being injected into raw HTML.

### From a selection to `file:L24-L25`

1. `utils/dom.ts#readSelection` finds the closest `[data-line-start]` of both ends of the
   selection (only inside `[data-doc]` text) → the block range.
2. In the Read view `utils/quote.ts#locateQuote` narrows it: it strips Markdown markup from
   the source lines of the block, joins them, finds the selected text and maps it back to
   the lines it spans. The Source view already has exact lines.
3. The draft keeps the quote. Suggested edits keep the quote as the original and the
   replacement next to it.

### Comments and progress

`stores/review.ts` keeps `{ comments, read }` in localStorage under
`mdifit:v1:<root path>`, syncs across tabs through the `storage` event, and fails soft when
storage is blocked. `read[path]` is the file's mtime when it was marked read, so a file
edited afterwards shows as *edited* and counts as unread again. Comments keep the line
numbers they were written against; after an edit they can drift a little, and the quote
keeps them understandable.

### Prompt

`utils/prompt.ts` is difit's format, so both tools paste the same way:

~~~
plans/release-plan.md:L24-L25
> enable the reconciliation mechanism first on GrokBot
Add a rollback criterion if GrokBot does not confirm within 48 h.
=====
plans/release-plan.md:L61
ORIGINAL:
```
50 agents per release
```
SUGGESTED:
```
20 agents per batch
```
~~~

Paths are prefixed with `promptBase` (the root relative to where the CLI started), so the
agent running in that folder can open them.

## Development

`npm run dev` runs `scripts/dev.js`: one Vite dev server on `:47614` with
`scripts/dev-api.ts` mounting the Hono app as middleware for `/api/*` and `/raw/*`.
Server modules are loaded through Vite's SSR module graph, so editing them recreates the
app on the next request; the client hot-reloads as usual. The docs folder is real: point it
anywhere with `npm run dev -- <folder>`. The dev origin differs from the CLI's, so dev
comments never mix with real ones.

`npm run build` writes `dist/client` (Vite) and `dist/node` (tsc, `.ts` imports rewritten to
`.js`). The published package ships `dist/` only; runtime dependencies are `hono` and
`@hono/node-server`, everything the client needs is bundled.

## Follow-ups

- Sanitized raw HTML (`<details>`, `<br>`) instead of escaping it (ADR-002).
- Re-anchoring comments by quote after a file changes, instead of keeping line numbers.
- Mermaid diagrams, math.
- An agent loop (`--wait` that blocks until "Submit review" and prints the prompt) was
  designed and deliberately left out of v1.
