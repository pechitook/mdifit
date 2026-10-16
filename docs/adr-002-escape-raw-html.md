# ADR-002: Raw HTML in Markdown stays escaped

## Problem

Markdown may contain raw HTML. Rendering it as-is would let any file in the folder (often
written by an agent, or pulled from someone else's repo) run script on
`localhost:1905`, read every other file through the API and the review in localStorage.

## Decision

markdown-it runs with `html: false`: raw HTML is shown as text. Links open external
targets in a new tab with `noopener`; images load through `/raw/*`, which serves image
types only with a `sandbox` CSP.

## Tradeoffs

Harmless tags people use in docs (`<details>`, `<br>`, `<kbd>`) show up literally.

## How to reverse

Enable `html: true` and pass the rendered HTML through a sanitizer with an allow-list
(DOMPurify) before it reaches `v-html` in `ReadView.vue`. Keep the sandbox on `/raw/*`.
