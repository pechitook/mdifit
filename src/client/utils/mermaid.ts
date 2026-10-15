import type MermaidApi from 'mermaid'

/**
 * Draws Mermaid diagrams. Mermaid is large, so it is imported on first use and
 * lands in its own chunk: documents without diagrams never download it.
 * Results are cached by theme and source, so live reloads and new comments do
 * not redraw anything.
 */

export type DiagramTheme = 'light' | 'dark'

export type DiagramResult = { svg: string; error: null } | { svg: null; error: string }

type Mermaid = typeof MermaidApi

const cache = new Map<string, Promise<DiagramResult>>()
let loader: Promise<Mermaid> | null = null
let configuredTheme: DiagramTheme | null = null
let counter = 0
/** Mermaid renders one diagram at a time; parallel renders corrupt each other. */
let queue: Promise<unknown> = Promise.resolve()

export function cacheKey(theme: DiagramTheme, source: string): string {
  return `${theme}\n${source}`
}

/** Mermaid errors are long and multi-line; the first line says what and where. */
export function errorSummary(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const first = message.split('\n').find((line) => line.trim()) ?? 'Invalid diagram'
  return first.trim().replace(/:$/, '')
}

export function renderDiagram(source: string, theme: DiagramTheme): Promise<DiagramResult> {
  const key = cacheKey(theme, source)
  const cached = cache.get(key)
  if (cached) return cached
  const result = enqueue(() => draw(source, theme))
  cache.set(key, result)
  return result
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.catch(() => undefined)
  return run
}

async function draw(source: string, theme: DiagramTheme): Promise<DiagramResult> {
  const mermaid = await load()
  if (configuredTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      // No click handlers or raw HTML from diagrams: see docs/adr-002-escape-raw-html.md.
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
      fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
    })
    configuredTheme = theme
  }

  const id = `mdifit-diagram-${++counter}`
  try {
    await mermaid.parse(source)
    const { svg } = await mermaid.render(id, source)
    return { svg, error: null }
  } catch (error) {
    return { svg: null, error: errorSummary(error) }
  } finally {
    // On failure Mermaid leaves its scratch element in <body>.
    document.getElementById(`d${id}`)?.remove()
    document.getElementById(id)?.remove()
  }
}

function load(): Promise<Mermaid> {
  loader ??= import('mermaid').then((module) => module.default)
  return loader
}
