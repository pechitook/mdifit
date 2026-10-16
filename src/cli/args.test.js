import { describe, expect, it } from 'vitest'
import { parseCliArgs } from './args.ts'

describe('parseCliArgs', () => {
  it('defaults to the current folder, an automatic port and opening the browser', () => {
    expect(parseCliArgs([])).toEqual({
      kind: 'run',
      options: { target: '.', port: null, open: true },
    })
  })

  it('takes a path, a port and --no-open', () => {
    expect(parseCliArgs(['plans/', '--port', '5000', '--no-open'])).toEqual({
      kind: 'run',
      options: { target: 'plans/', port: 5000, open: false },
    })
  })

  it('answers help and version', () => {
    expect(parseCliArgs(['-h']).kind).toBe('help')
    expect(parseCliArgs(['--version']).kind).toBe('version')
  })

  it('rejects bad ports, extra paths and unknown flags', () => {
    expect(parseCliArgs(['--port', 'abc'])).toEqual({ kind: 'error', message: 'Invalid port: abc' })
    expect(parseCliArgs(['--port', '70000']).kind).toBe('error')
    expect(parseCliArgs(['a', 'b'])).toEqual({ kind: 'error', message: 'Expected one path, got 2' })
    expect(parseCliArgs(['--nope']).kind).toBe('error')
  })
})
