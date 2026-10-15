import { describe, expect, it } from 'vitest'
import {
  comparePaths,
  extractTitle,
  isIgnoredDirName,
  isIgnoredPath,
  isMarkdownPath,
  promptBaseFor,
  resolveInside,
} from './workspace.rules.ts'

describe('isMarkdownPath', () => {
  it('accepts .md and .markdown in any case', () => {
    expect(isMarkdownPath('a/b/plan.md')).toBe(true)
    expect(isMarkdownPath('README.MD')).toBe(true)
    expect(isMarkdownPath('notes.markdown')).toBe(true)
  })

  it('rejects everything else', () => {
    expect(isMarkdownPath('plan.mdx')).toBe(false)
    expect(isMarkdownPath('image.png')).toBe(false)
    expect(isMarkdownPath('md')).toBe(false)
  })
})

describe('isIgnoredDirName / isIgnoredPath', () => {
  it('skips hidden and build folders', () => {
    expect(isIgnoredDirName('.git')).toBe(true)
    expect(isIgnoredDirName('node_modules')).toBe(true)
    expect(isIgnoredDirName('plans')).toBe(false)
  })

  it('looks at folder segments only, not the file name', () => {
    expect(isIgnoredPath('node_modules/pkg/README.md')).toBe(true)
    expect(isIgnoredPath('docs/.drafts/a.md')).toBe(true)
    expect(isIgnoredPath('docs/a.md')).toBe(false)
    expect(isIgnoredPath('.hidden.md')).toBe(false)
  })
})

describe('resolveInside', () => {
  const root = '/work/docs'

  it('resolves paths inside the root', () => {
    expect(resolveInside(root, 'a/b.md')).toBe('/work/docs/a/b.md')
    expect(resolveInside(root, './a/../b.md')).toBe('/work/docs/b.md')
  })

  it('rejects escapes, absolute paths and the root itself', () => {
    expect(resolveInside(root, '../secret.md')).toBeNull()
    expect(resolveInside(root, 'a/../../secret.md')).toBeNull()
    expect(resolveInside(root, '/etc/passwd')).toBeNull()
    expect(resolveInside(root, '')).toBeNull()
    expect(resolveInside(root, '.')).toBeNull()
    expect(resolveInside(root, 'a\0.md')).toBeNull()
  })

  it('does not confuse a sibling folder with the same prefix', () => {
    expect(resolveInside(root, '../docs-private/a.md')).toBeNull()
  })
})

describe('promptBaseFor', () => {
  it('is relative to the folder the CLI started in', () => {
    expect(promptBaseFor('/repo', '/repo/plans')).toBe('plans/')
    expect(promptBaseFor('/repo', '/repo/plans/orders')).toBe('plans/orders/')
  })

  it('is empty when the root is the current folder', () => {
    expect(promptBaseFor('/repo', '/repo')).toBe('')
  })

  it('climbs when the root is outside', () => {
    expect(promptBaseFor('/repo/app', '/repo/docs')).toBe('../docs/')
  })
})

describe('extractTitle', () => {
  it('uses the first h1', () => {
    expect(extractTitle('intro\n\n# Release plan\n\n## Scope')).toBe('Release plan')
  })

  it('strips closing hashes', () => {
    expect(extractTitle('# Release plan ##')).toBe('Release plan')
  })

  it('prefers front matter title', () => {
    expect(extractTitle('---\ntitle: "From front matter"\n---\n# Heading')).toBe(
      'From front matter',
    )
  })

  it('skips headings inside code fences', () => {
    expect(extractTitle('```md\n# not this\n```\n# This one')).toBe('This one')
  })

  it('ignores h2 and returns null without a title', () => {
    expect(extractTitle('## Only h2\ntext')).toBeNull()
    expect(extractTitle('')).toBeNull()
  })
})

describe('comparePaths', () => {
  it('sorts case-insensitively and numerically', () => {
    const sorted = ['b.md', 'A.md', 'step-10.md', 'step-2.md'].toSorted(comparePaths)
    expect(sorted).toEqual(['A.md', 'b.md', 'step-2.md', 'step-10.md'])
  })
})
