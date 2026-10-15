import { symlink } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { makeTree } from '../../test-helpers.js'
import {
  getWorkspace,
  isWorkspaceMarkdown,
  readMarkdown,
  readRaw,
  resolveWorkspace,
} from './workspace.ts'

let tree

afterEach(async () => {
  await tree?.cleanup()
  tree = undefined
})

describe('resolveWorkspace', () => {
  it('uses a folder as its own root', async () => {
    tree = await makeTree({ 'a.md': '# A' })
    const config = await resolveWorkspace(tree.root, '/')
    expect(config).toEqual({ target: tree.root, root: tree.root, only: null, cwd: '/' })
  })

  it('uses the parent folder for a single file', async () => {
    tree = await makeTree({ 'docs/plan.md': '# Plan' })
    const config = await resolveWorkspace('docs/plan.md', tree.root)
    expect(config.root).toBe(path.join(tree.root, 'docs'))
    expect(config.only).toBe('plan.md')
  })

  it('fails for missing paths and non-Markdown files', async () => {
    tree = await makeTree({ 'a.txt': 'x' })
    await expect(resolveWorkspace('missing', tree.root)).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(resolveWorkspace('a.txt', tree.root)).rejects.toMatchObject({
      code: 'bad_request',
    })
  })
})

describe('getWorkspace', () => {
  it('lists Markdown files sorted, with titles, skipping ignored folders', async () => {
    tree = await makeTree({
      'README.md': '# Readme',
      'plans/b.md': 'no title',
      'plans/a.markdown': '# A plan',
      'plans/image.png': 'png',
      'node_modules/pkg/README.md': '# dep',
      '.git/notes.md': '# git',
    })
    const config = await resolveWorkspace(tree.root, path.dirname(tree.root))
    const workspace = await getWorkspace(config)

    expect(workspace.name).toBe(path.basename(tree.root))
    expect(workspace.promptBase).toBe(`${path.basename(tree.root)}/`)
    expect(workspace.single).toBe(false)
    expect(workspace.files.map((f) => [f.path, f.title])).toEqual([
      ['plans/a.markdown', 'A plan'],
      ['plans/b.md', null],
      ['README.md', 'Readme'],
    ])
    expect(workspace.files[0].mtimeMs).toBeGreaterThan(0)
  })

  it('skips symlinks', async () => {
    tree = await makeTree({ 'docs/a.md': '# A' })
    await symlink(path.join(tree.root, 'docs'), path.join(tree.root, 'loop'))
    const workspace = await getWorkspace(await resolveWorkspace(tree.root, tree.root))
    expect(workspace.files.map((f) => f.path)).toEqual(['docs/a.md'])
  })

  it('lists only the given file in single-file mode', async () => {
    tree = await makeTree({ 'plan.md': '# Plan', 'other.md': '# Other' })
    const workspace = await getWorkspace(await resolveWorkspace('plan.md', tree.root))
    expect(workspace.single).toBe(true)
    expect(workspace.promptBase).toBe('')
    expect(workspace.files.map((f) => f.path)).toEqual(['plan.md'])
  })
})

describe('readMarkdown', () => {
  it('returns the source and mtime', async () => {
    tree = await makeTree({ 'a/b.md': '# B\n\ntext' })
    const config = await resolveWorkspace(tree.root, tree.root)
    const file = await readMarkdown(config, 'a/b.md')
    expect(file.path).toBe('a/b.md')
    expect(file.source).toBe('# B\n\ntext')
    expect(file.mtimeMs).toBeGreaterThan(0)
  })

  it('refuses paths outside the root, non-Markdown files and missing files', async () => {
    tree = await makeTree({ 'docs/a.md': '# A', 'secret.md': 'no', 'docs/x.txt': 'x' })
    const config = await resolveWorkspace('docs', tree.root)
    await expect(readMarkdown(config, '../secret.md')).rejects.toMatchObject({ code: 'not_found' })
    await expect(readMarkdown(config, 'x.txt')).rejects.toMatchObject({ code: 'not_found' })
    await expect(readMarkdown(config, 'missing.md')).rejects.toMatchObject({ code: 'not_found' })
  })

  it('only serves the given file in single-file mode', async () => {
    tree = await makeTree({ 'plan.md': '# Plan', 'other.md': '# Other' })
    const config = await resolveWorkspace('plan.md', tree.root)
    expect(isWorkspaceMarkdown(config, 'plan.md')).toBe(true)
    await expect(readMarkdown(config, 'other.md')).rejects.toMatchObject({ code: 'not_found' })
  })
})

describe('readRaw', () => {
  it('serves images inside the root with their content type', async () => {
    tree = await makeTree({ 'img/a.png': 'png-bytes' })
    const config = await resolveWorkspace(tree.root, tree.root)
    const raw = await readRaw(config, 'img/a.png')
    expect(raw.contentType).toBe('image/png')
    expect(raw.body.toString()).toBe('png-bytes')
  })

  it('refuses other file types and escapes', async () => {
    tree = await makeTree({ 'docs/a.md': '# A', 'docs/.env': 'SECRET=1', 'b.png': 'x' })
    const config = await resolveWorkspace('docs', tree.root)
    await expect(readRaw(config, '.env')).rejects.toMatchObject({ code: 'not_found' })
    await expect(readRaw(config, 'a.md')).rejects.toMatchObject({ code: 'not_found' })
    await expect(readRaw(config, '../b.png')).rejects.toMatchObject({ code: 'not_found' })
  })
})
