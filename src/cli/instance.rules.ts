import { DEFAULT_PORT, PORT_SPAN } from './args.ts'

/** What is already listening on the port, if anything. */
export type Probe = { kind: 'free' } | { kind: 'mdifit'; target: string } | { kind: 'other' }

export type StartPlan =
  | { kind: 'start' }
  /** The same target is already served: just open the browser on it. */
  | { kind: 'reuse' }
  | { kind: 'conflict'; message: string }

export function planStart(probe: Probe, target: string, port: number): StartPlan {
  switch (probe.kind) {
    case 'free':
      return { kind: 'start' }
    case 'mdifit':
      if (probe.target === target) return { kind: 'reuse' }
      return {
        kind: 'conflict',
        message:
          `mdifit is already serving ${probe.target} on port ${port}.\n` +
          `Stop it (Ctrl+C in its terminal), pass another --port, or leave --port out.\n` +
          `Comments are stored per port: a different port starts with none.`,
      }
    case 'other':
      return {
        kind: 'conflict',
        message: `Port ${port} is taken by another program. Pass another --port, or leave it out.`,
      }
  }
}

/**
 * Ports to try, in order: the one this folder used last, then DEFAULT_PORT and
 * the next PORT_SPAN - 1 ports. Keeping a folder on its port keeps its comments.
 */
export function candidatePorts(
  remembered: number | null,
  base = DEFAULT_PORT,
  span = PORT_SPAN,
): number[] {
  const range = Array.from({ length: span }, (_, i) => base + i)
  return remembered === null ? range : [remembered, ...range.filter((port) => port !== remembered)]
}

/** For an automatic port: use it, open the instance already serving this folder, or move on. */
export function decidePort(probe: Probe, target: string): 'start' | 'reuse' | 'skip' {
  if (probe.kind === 'free') return 'start'
  if (probe.kind === 'mdifit' && probe.target === target) return 'reuse'
  return 'skip'
}

export function noFreePortMessage(ports: number[]): string {
  return `Ports ${ports[0]}–${ports.at(-1)} are all taken. Stop another mdifit or pass --port.`
}
