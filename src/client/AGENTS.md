# AGENTS.md — client

Vue 3 + Vite web UI. No router library, no state library. Deep dive:
[../../ARCHITECTURE.md](../../ARCHITECTURE.md#client).

## Layers (one way)

```
view (*.vue)  →  *.helpers.ts  →  services/ · stores/ · utils/
```

- **Views** hold UI state only (open, draft, selection) and delegate.
- **`*.helpers.ts`** next to the view hold its rules, pure, with `*.helpers.test.js`.
- **`services/api.ts`**: one function per endpoint, no logic. Nothing else calls `fetch`.
- **`stores/review.ts`**: comments + reading progress in localStorage, one store per
  workspace root; pure parsing and derived data in `review.helpers.ts`.
- **`utils/`**: shared pure modules (`markdown`, `prompt`, `quote`, `route`, `paths`,
  `shortcuts`, `text`) plus `dom.ts`, the only browser-only helpers.

## Co-location

```
views/Reader/
  Reader.vue
  Reader.helpers.ts
  Reader.helpers.test.js
  components/CommentCard.vue   # used only by this view
```

A component used by two views moves to `components/ui/`. Nothing goes there in advance.

## Rules

1. **Top-level folders must not be named `api` or `raw`**: Vite serves `src/client` at `/`,
   so they would collide with the server routes in dev.
2. Colors only through the tokens in `theme/tokens.css`; light and dark both.
3. Rendered Markdown is split into top-level blocks that carry `data-line-start/end`;
   selections map to lines through those attributes and `utils/quote.ts`.
4. Only text marked `data-doc` is commentable (never comment cards or the composer).
5. **The Read view stays calm**: no line numbers, no yellow, nothing that takes vertical
   space. Comments are highlights (CSS Custom Highlight API, never DOM rewrites) plus margin
   bubbles; composers are popovers. Line numbers belong to the Source view and the prompt.
6. Single-key shortcuts never fire while typing; the key map lives in `utils/shortcuts.ts`
   so the help dialog and the handler agree.
7. Accessible as built: real buttons and links, labels on inputs, `aria-label` on icon buttons.
