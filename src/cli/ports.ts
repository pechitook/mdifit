import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/**
 * Which port each folder used last, so it gets the same one next time: comments
 * live in the browser per origin, and the port is part of the origin. Stored in
 * the user's config folder, never in the folder being reviewed. Best effort:
 * an unreadable or unwritable file just means no memory.
 */

type PortMap = Record<string, number>

/** Folders remembered at most; the oldest entries are dropped first. */
const MAX_ENTRIES = 200

export function portsFile(env: NodeJS.ProcessEnv = process.env, home = os.homedir()): string {
  const config = env.XDG_CONFIG_HOME || path.join(home, '.config')
  return path.join(config, 'mdifit', 'ports.json')
}

export function parsePortMap(raw: string | null): PortMap {
  if (!raw) return {}
  try {
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    const map: PortMap = {}
    for (const [target, port] of Object.entries(data)) {
      if (Number.isInteger(port) && (port as number) > 0 && (port as number) <= 65535) {
        map[target] = port as number
      }
    }
    return map
  } catch {
    return {}
  }
}

/** The map with `target` set to `port`, most recent last, capped at MAX_ENTRIES. */
export function withPort(map: PortMap, target: string, port: number): PortMap {
  const entries = Object.entries(map).filter(([key]) => key !== target)
  entries.push([target, port])
  return Object.fromEntries(entries.slice(-MAX_ENTRIES))
}

export async function rememberedPort(file: string, target: string): Promise<number | null> {
  const map = parsePortMap(await readFile(file, 'utf8').catch(() => null))
  return map[target] ?? null
}

export async function rememberPort(file: string, target: string, port: number): Promise<void> {
  try {
    const map = parsePortMap(await readFile(file, 'utf8').catch(() => null))
    if (map[target] === port) return
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, `${JSON.stringify(withPort(map, target, port), null, 2)}\n`)
  } catch {
    // No memory this time; the next run starts from DEFAULT_PORT again.
  }
}
