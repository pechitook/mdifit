import type { HealthResponse } from '../shared/api.ts'
import type { Probe } from './instance.rules.ts'

/** Asks whoever listens on the port whether it is mdifit, and what it serves. */
export async function probePort(port: number): Promise<Probe> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(1000),
    })
    const body = (await res.json().catch(() => null)) as Partial<HealthResponse> | null
    if (body?.app === 'mdifit' && typeof body.target === 'string') {
      return { kind: 'mdifit', target: body.target }
    }
    return { kind: 'other' }
  } catch (error) {
    const code = (error as { cause?: { code?: string } }).cause?.code
    return code === 'ECONNREFUSED' ? { kind: 'free' } : { kind: 'other' }
  }
}
