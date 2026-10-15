import { afterEach, describe, expect, it } from 'vitest'
import { makeTree } from '../../test-helpers.js'
import { resolveWorkspace } from '../workspace/workspace.ts'
import { createSearch } from './search.ts'

let tree

afterEach(async () => {
  await tree?.cleanup()
})

describe('createSearch', () => {
  it('searches the files on disk and sees edits', async () => {
    tree = await makeTree({ 'a.md': '# Alpha\nfirst line', 'b/c.md': 'nothing' })
    const search = createSearch(await resolveWorkspace(tree.root, tree.root))

    expect((await search('alpha')).map((h) => [h.kind, h.path, h.line])).toEqual([
      ['heading', 'a.md', 1],
    ])

    // A later mtime makes the cache re-read the file.
    await new Promise((resolve) => setTimeout(resolve, 20))
    await tree.write('b/c.md', 'now mentions alpha')
    expect((await search('alpha')).map((h) => h.path)).toEqual(['a.md', 'b/c.md'])
  })
})
