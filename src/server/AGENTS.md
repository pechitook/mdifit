# AGENTS.md — server

Hono app the CLI serves on `127.0.0.1`. Deep dive: [../../ARCHITECTURE.md](../../ARCHITECTURE.md#server).

## Layers (one way)

```
app.ts       host check, routes, static client, error envelope, close()
routes.ts    the only place routes are registered
controllers/<d>/<d>.ts   parse the request, call a module, shape the response. No fs.
modules/<d>/<d>.ts       IO (node:fs) + orchestration. Never imports Hono. Throws AppError.
modules/<d>/<d>.rules.ts pure rules, tested without IO
lib/         errors (AppError), host (loopback check), static (built client)
```

Domains: `workspace` (list, read, raw media, path rules), `search` (headings + text),
`watch` (fs.watch → change events).

## Rules

1. Client-supplied paths go through `resolveInside(root, path)`; Markdown reads also through
   `isWorkspaceMarkdown` (single-file mode serves one file only).
2. Errors: throw `AppError('not_found' | 'bad_request' | 'forbidden', message)`. The envelope
   is `{ error: { code, message } }`. Anything else is a 500 and gets logged.
3. `/raw/*` serves images only, with a sandbox CSP.
4. Response shapes are declared in `src/shared/api.ts`; change both sides together.

## Adding an endpoint

1. Pure logic in `modules/<d>/<d>.rules.ts` + `<d>.rules.test.js`.
2. IO in `modules/<d>/<d>.ts` + a test against a real temp folder (`test-helpers.js` → `makeTree`).
3. Controller in `controllers/<d>/<d>.ts`, mounted in `routes.ts`.
4. Types in `src/shared/api.ts`, a request test in `app.test.js`.
5. `npm run typecheck && npm test`.
