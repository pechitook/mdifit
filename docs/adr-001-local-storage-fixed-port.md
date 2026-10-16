# ADR-001: Comments live in localStorage, on a stable port

## Problem

Comments must survive closing the browser and restarting the CLI, but writing review
state into the folder being reviewed (`.mdifit/comments.json`) dirties repos, needs
`.gitignore` entries and turns a read-only tool into one that writes.

## Decision

Keep comments and reading progress in the browser's localStorage, keyed by the absolute
root path (`mdifit:v1:<root>`). Give each folder a stable port: the one it used last,
else `1905` or the next free one up to `1924`. The CLI remembers folder → port in
`~/.config/mdifit/ports.json` (outside the folder being reviewed).

localStorage is per origin, and the port is part of the origin: a tool that picks a random
free port (difit's default) would show an empty review whenever the port changed. `1905`,
the year Boca Juniors was founded, is uncommon and below the macOS/Linux ephemeral range,
so it is rarely taken. When a candidate is taken by mdifit for the same folder, the CLI
reuses it; when it is taken by anything else, it tries the next one.

0.1.0 and 0.1.1 used one fixed port and refused to start on a conflict. That kept storage
simple but made it impossible to review two folders at once, so 0.1.2 moved to the
remembered port.

## Tradeoffs

- Comments are per browser and per machine; they do not travel with the repo. That is the
  point: a review is personal until it is copied as a prompt.
- A folder whose port is busy (another folder opened there first) lands on a new port and
  starts with an empty review until its own port is free again. Remembering the port per
  folder makes this rare.
- `--port` pins one exact port and fails on a conflict instead of moving.
- Clearing site data clears the review.

## How to reverse

Swap `stores/review.ts` for a store backed by a server endpoint that writes a file; the
pure helpers (`review.helpers.ts`) and the rest of the client do not change.
