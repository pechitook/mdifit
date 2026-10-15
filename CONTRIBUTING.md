# Contributing

Thanks for helping. Issues and pull requests are welcome.

## Setup

Node.js 24 or later and npm (no other package manager).

```bash
npm install
npm run dev                 # UI + API with hot reload over fixtures/docs, on :47614
npm run dev -- ~/your/docs  # or over any folder on disk
```

## Before opening a pull request

```bash
npm run check   # oxlint, oxfmt --check, tsc + vue-tsc, vitest
npm run build
```

- Read [AGENTS.md](AGENTS.md) (conventions and invariants) and the `AGENTS.md` of the
  layer you touch. [ARCHITECTURE.md](ARCHITECTURE.md) explains how the pieces fit.
- Put each test next to the code it covers as `name.test.js`. Prefer pure functions in
  `*.rules.ts` / `*.helpers.ts`; server tests use real temp folders, not `fs` mocks.
- Keep commits small, one logical change each, with
  [Conventional Commits](https://www.conventionalcommits.org/): `feat(client): …`,
  `fix(server): …`, `docs: …`.
- For UI changes, add a screenshot to the pull request and check light and dark.
- Update `CHANGELOG.md` under *Unreleased*.

## Decisions

Consequential decisions are written down as ADRs in `docs/`. If your change reverses one,
update or supersede the ADR in the same pull request.
