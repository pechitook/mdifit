import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parsePortMap, portsFile, rememberPort, rememberedPort, withPort } from './ports.ts'

let dir

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = undefined
})

describe('portsFile', () => {
  it('lives in XDG_CONFIG_HOME, or ~/.config', () => {
    expect(portsFile({ XDG_CONFIG_HOME: '/cfg' }, '/home/me')).toBe('/cfg/mdifit/ports.json')
    expect(portsFile({}, '/home/me')).toBe('/home/me/.config/mdifit/ports.json')
  })
})

describe('parsePortMap / withPort', () => {
  it('keeps valid ports only and survives garbage', () => {
    expect(parsePortMap('{"/a": 1905, "/b": "x", "/c": 70000}')).toEqual({ '/a': 1905 })
    expect(parsePortMap('not json')).toEqual({})
    expect(parsePortMap('[1]')).toEqual({})
    expect(parsePortMap(null)).toEqual({})
  })

  it('moves the updated folder to the end', () => {
    expect(Object.keys(withPort({ '/a': 1905, '/b': 1906 }, '/a', 1907))).toEqual(['/b', '/a'])
  })
})

describe('rememberPort / rememberedPort', () => {
  it('round-trips through a real file, creating its folder', async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'mdifit-ports-'))
    const file = path.join(dir, 'mdifit', 'ports.json')
    expect(await rememberedPort(file, '/docs')).toBeNull()

    await rememberPort(file, '/docs', 1906)
    await rememberPort(file, '/plans', 1905)
    expect(await rememberedPort(file, '/docs')).toBe(1906)
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ '/docs': 1906, '/plans': 1905 })
  })

  it('fails soft when the file cannot be written', async () => {
    await expect(rememberPort('/dev/null/nope/ports.json', '/docs', 1905)).resolves.toBeUndefined()
  })
})
