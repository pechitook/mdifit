import { afterEach, describe, expect, it } from 'vitest'
import { makeTree } from '../../test-helpers.js'
import { resolveWorkspace } from '../workspace/workspace.ts'
import { createWatcher } from './watch.ts'

let tree
let watcher

afterEach(async () => {
  watcher?.close()
  await tree?.cleanup()
})

function nextChange(w, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no change event')), timeoutMs)
    const unsubscribe = w.subscribe((relPath) => {
      clearTimeout(timer)
      unsubscribe()
      resolve(relPath)
    })
  })
}

// fs.watch needs a moment to attach before the first write is seen.
const settle = () => new Promise((resolve) => setTimeout(resolve, 100))

describe('createWatcher', () => {
  it('reports edits to Markdown files with their workspace path', async () => {
    tree = await makeTree({ 'docs/a.md': '# A' })
    watcher = createWatcher(await resolveWorkspace(tree.root, tree.root))
    await settle()

    const change = nextChange(watcher)
    await tree.write('docs/a.md', '# A edited')
    expect(await change).toBe('docs/a.md')
  })

  it('ignores files that are not workspace Markdown', async () => {
    tree = await makeTree({ 'a.md': '# A', 'node_modules/x/b.md': '# B', 'c.txt': 'c' })
    watcher = createWatcher(await resolveWorkspace(tree.root, tree.root))
    await settle()

    const change = nextChange(watcher)
    await tree.write('c.txt', 'changed')
    await tree.write('node_modules/x/b.md', 'changed')
    await tree.write('a.md', 'changed')
    expect(await change).toBe('a.md')
  })
})
