import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/**
 * Creates a real folder on disk with the given files (`{ 'a/b.md': '# B' }`).
 * Server tests run against the filesystem, never against mocks.
 */
export async function makeTree(files) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'mdifit-test-')))
  for (const [relPath, content] of Object.entries(files)) {
    const absolute = path.join(root, relPath)
    await mkdir(path.dirname(absolute), { recursive: true })
    await writeFile(absolute, content)
  }
  return {
    root,
    write: (relPath, content) => writeFile(path.join(root, relPath), content),
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}
