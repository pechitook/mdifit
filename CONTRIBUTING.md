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

## Trying the package locally

```bash
npm run build && npm pack
npx --package=./mdifit-0.1.0.tgz mdifit ~/some/docs
```

## Releasing

1. Move the *Unreleased* notes in `CHANGELOG.md` under the new version and commit.
2. `npm version patch` (or `minor` / `major`): bumps `package.json` and creates the tag.
3. `git push --follow-tags`. The `Release` workflow checks that the tag matches
   `package.json`, runs `npm run check`, builds, smoke-tests the packed CLI, publishes to npm
   with provenance and creates the GitHub release.

npm credentials, once: the very first publish has to exist before npm lets you configure a
trusted publisher, so either publish `0.1.0` by hand (`npm publish` after `npm login`), or
add an `NPM_TOKEN` secret (granular token, publish access). Then, on npmjs.com → package
settings → *Trusted publishing*, add GitHub Actions with repository `pechitook/mdifit`,
workflow `release.yml` and environment `npm`, and the token can be deleted.

## Decisions

Consequential decisions are written down as ADRs in `docs/`. If your change reverses one,
update or supersede the ADR in the same pull request.
