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
          `Stop it (Ctrl+C in its terminal) and run this again, or pass --port.\n` +
          `Comments are stored per port: a different port starts with none.`,
      }
    case 'other':
      return {
        kind: 'conflict',
        message: `Port ${port} is taken by another program. Free it or pass --port.`,
      }
  }
}
