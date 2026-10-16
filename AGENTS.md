# AGENTS.md — mdifit

Entry point for anyone (human or agent) working in this repo. Concise on purpose: each
layer has its own `AGENTS.md` (how to work there) and the deep dive lives in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## What it is

`npx mdifit [folder|file]` serves a folder of Markdown on `localhost`, renders it like a
good Markdown reader, and lets you comment while you read: on a line, a range, a selected
phrase, or as a suggested edit. "Copy all prompt" turns the review into text for a coding
agent, in [difit](https://github.com/yoshiko-pg/difit)'s format: `path:L12` + feedback.
Comments live in the browser (localStorage); nothing is written to the folder.

## Map

| Folder | What it is | Docs |
|---|---|---|
| `src/cli/` | `mdifit` binary: args, fixed port, reuse a running instance, open the browser | [ARCHITECTURE](ARCHITECTURE.md#cli) |
| `src/server/` | Hono app: workspace listing, file reads, search, change events, static client | [AGENTS](src/server/AGENTS.md) |
| `src/client/` | Vue 3 web UI: reader, comments, prompt, palette | [AGENTS](src/client/AGENTS.md) |
| `src/shared/` | HTTP contract types only (no runtime code) | `api.ts` |
| `scripts/` | Dev tooling: Vite dev server with the API in-process | [ARCHITECTURE](ARCHITECTURE.md#development) |
| `fixtures/docs/` | Sample Markdown for `npm run dev` and manual testing | — |
| `docs/` | Decisions (ADRs) | index below |

Decisions: [comments in localStorage on a fixed port](docs/adr-001-local-storage-fixed-port.md) ·
[raw HTML stays escaped](docs/adr-002-escape-raw-html.md).

## Commands

```bash
npm install
npm run dev                 # Vite + API on :47614 over fixtures/docs (hot reload)
npm run dev -- ~/some/docs  # same, over any folder on disk
npm test                    # vitest run (src/**/*.test.js)
npm run typecheck           # tsc (cli/server) + vue-tsc (client)
npm run lint && npm run format:check
npm run check               # all of the above
npm run build               # dist/client (Vite) + dist/node (tsc)
node src/cli/index.ts docs  # run the CLI from source (Node strips the types)
```

Ports: CLI `1905` (fixed, see ADR-001) · dev `47614`.

## Invariants (never break)

1. **Layers point one way.** Server: `routes.ts → controllers/ → modules/ → node:fs`.
   A controller never touches `fs`; a module never imports Hono. Client:
   `view (*.vue) → *.helpers.ts → services/ · stores/ · utils/`.
2. **Every client path goes through `resolveInside`** before it reaches the filesystem.
   The server only answers requests whose `Host` is a loopback name.
3. **Raw HTML in Markdown is escaped**, never rendered (ADR-002).
4. **The fixed port is the storage key.** Do not make the port dynamic or "find a free one".
5. **Co-location and JS tests.** Every module has its `*.test.js` next to it, importing the
   `.ts` explicitly. Pure rules live in `*.rules.ts` / `*.helpers.ts`; tests need no DOM,
   no network and no mocks of `fs` (server tests use real temp folders).
6. **The prompt format is difit's.** `path:L12` or `path:L12-L14`, then feedback,
   comments joined by `\n=====\n`, suggestions as `ORIGINAL:` / `SUGGESTED:` fences.
7. **`src/shared/` holds types only.**

## Conventions

- Code, docs, UI copy and commits in English.
- TypeScript strict; type-only imports with `import type`; relative imports keep the `.ts`
  extension (rewritten to `.js` on build).
- No semicolons, single quotes, 100 columns (oxfmt). Pin dependencies exactly (`.npmrc`).
- Conventional Commits, small and granular, suite green at each one. Stage by path,
  never `git add .`. No agent or tool attribution in commits or PRs.
- Nobody (human or agent) commits without being asked to.
- Tool-neutral: what an agent needs to know lives here and in the repo docs, not in
  tool-specific folders. `CLAUDE.md` only imports this file.
