# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.1] - 2026-10-16

### Changed

- The fixed port is now 1905. Comments saved under the old port (47613) stay in that
  origin's storage and do not carry over.

### Fixed

- Margin popovers opened near the bottom of the window scroll into view.
- ⌘K says "Searching…" while results are on their way instead of "Nothing found".

## [0.1.0] - 2026-10-15

### Added

- `mdifit [folder|file]` serves Markdown on a fixed port (47613) and reuses a running
  instance for the same folder.
- Read view with GitHub-flavored Markdown, alerts, task lists, syntax highlighting,
  relative links and images, light and dark themes.
- Comments on a selection, a block or a source line range; suggested edits.
- Source view with line numbers.
- Copy all prompt in difit's format, with an editable preview.
- ⌘K search across files, headings and text.
- Reading progress per file, with "edited" when a file changes after it was read.
- Live reload when files change on disk.
- Folder pages: a folder opens with its `README.md` / `AGENTS.md` / `index.md` under a
  foldable file list, or shows the list when it has none. Clickable breadcrumb.
- Mermaid diagrams, loaded on demand, following the light/dark theme, with a Diagram / Code
  switch, a full-size view and comments on node labels.
- Buttons and shortcuts (B, N) to show or hide the files and comments panels, remembered
  across sessions.
- Calm reading view: no line numbers, comments as a soft underline plus a bubble in the
  margin, composer and opened comments in a popover beside the text, suggested edits
  previewed inline. Neutral colors instead of yellow.
- Selections snap to whole words.
