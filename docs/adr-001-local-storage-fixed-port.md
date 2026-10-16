# ADR-001: Comments live in localStorage, on a fixed port

## Problem

Comments must survive closing the browser and restarting the CLI, but writing review
state into the folder being reviewed (`.mdifit/comments.json`) dirties repos, needs
`.gitignore` entries and turns a read-only tool into one that writes.

## Decision

Keep comments and reading progress in the browser's localStorage, keyed by the absolute
root path (`mdifit:v1:<root>`). Serve on one fixed port, `1905`, every time.

localStorage is per origin, and the port is part of the origin: a tool that picks "any free
port" (difit's default) would show an empty review whenever the port changed. `1905`, the
year Boca Juniors was founded, is uncommon and below the macOS/Linux ephemeral range, so it
is rarely taken. When it is taken
by another mdifit for the same folder, the CLI reuses it; otherwise it explains the
conflict instead of silently moving.

## Tradeoffs

- Comments are per browser and per machine; they do not travel with the repo. That is the
  point: a review is personal until it is copied as a prompt.
- `--port` exists for real conflicts, and the help says a different port starts empty.
- Clearing site data clears the review.

## How to reverse

Swap `stores/review.ts` for a store backed by a server endpoint that writes a file; the
pure helpers (`review.helpers.ts`) and the rest of the client do not change.
