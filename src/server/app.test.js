import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { resolveWorkspace } from './modules/workspace/workspace.ts'
import { makeTree } from './test-helpers.js'

let tree
let mdifit

afterEach(async () => {
  mdifit?.close()
  await tree?.cleanup()
})

async function setup(files, { clientDir = null } = {}) {
  tree = await makeTree(files)
  const config = await resolveWorkspace(tree.root, tree.root)
  mdifit = createApp({ config, version: '0.0.0-test', clientDir })
  return (url, init = {}) =>
    mdifit.app.request(url, { ...init, headers: { host: 'localhost:1905', ...init.headers } })
}

describe('API', () => {
  it('reports health with the target', async () => {
    const request = await setup({ 'a.md': '# A' })
    const res = await request('/api/health')
    expect(await res.json()).toEqual({ app: 'mdifit', version: '0.0.0-test', target: tree.root })
  })

  it('lists the workspace and reads a file', async () => {
    const request = await setup({ 'docs/a.md': '# A\n\nbody' })

    const workspace = await (await request('/api/workspace')).json()
    expect(workspace.files.map((f) => f.path)).toEqual(['docs/a.md'])

    const file = await (await request('/api/file?path=docs%2Fa.md')).json()
    expect(file.source).toBe('# A\n\nbody')
  })

  it('answers errors with the envelope', async () => {
    const request = await setup({ 'a.md': '# A' })

    const missing = await request('/api/file?path=..%2Fetc%2Fpasswd')
    expect(missing.status).toBe(404)
    expect((await missing.json()).error.code).toBe('not_found')

    const noPath = await request('/api/file')
    expect(noPath.status).toBe(400)

    const noRoute = await request('/api/nope')
    expect(noRoute.status).toBe(404)
  })

  it('searches headings and text', async () => {
    const request = await setup({ 'a.md': '# Alpha\n\nbeta gamma' })
    const { hits } = await (await request('/api/search?q=gamma')).json()
    expect(hits).toEqual([{ kind: 'text', path: 'a.md', line: 3, text: 'beta gamma', level: null }])
  })

  it('serves images sandboxed', async () => {
    const request = await setup({ 'img/a.svg': '<svg></svg>' })
    const res = await request('/raw/img/a.svg')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    expect(res.headers.get('content-security-policy')).toContain('sandbox')
  })

  it('refuses requests addressed to other hosts', async () => {
    const request = await setup({ 'a.md': '# A' })
    const res = await request('/api/workspace', { headers: { host: 'evil.example:1905' } })
    expect(res.status).toBe(403)
  })
})

describe('client', () => {
  it('serves the built client with an index fallback', async () => {
    const clientTree = await makeTree({})
    const clientDir = clientTree.root
    await mkdir(path.join(clientDir, 'assets'), { recursive: true })
    await writeFile(path.join(clientDir, 'index.html'), '<!doctype html><title>mdifit</title>')
    await writeFile(path.join(clientDir, 'assets', 'app-123.js'), 'console.log(1)')

    try {
      const request = await setup({ 'a.md': '# A' }, { clientDir })

      const asset = await request('/assets/app-123.js')
      expect(asset.headers.get('content-type')).toContain('text/javascript')
      expect(asset.headers.get('cache-control')).toContain('immutable')

      const page = await request('/some/deep/link')
      expect(await page.text()).toContain('<title>mdifit</title>')

      const api = await request('/api/nope')
      expect(api.status).toBe(404)
    } finally {
      await clientTree.cleanup()
    }
  })
})
